using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pulsar.API.Domain.Alertas;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Score;
using Pulsar.API.External.Clients;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class AlertaOficialServiceTests : IDisposable
{
    private static readonly Guid Se = new("20000000-0000-0000-0000-000000000001");
    private static readonly Guid Santos = new("20000000-0000-0000-0000-000000000033");
    // Entre o início (17:05Z) e o fim (20:00Z) dos alertas da amostra.
    private static readonly DateTime Agora = new(2026, 11, 18, 18, 0, 0, DateTimeKind.Utc);

    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly PulsarDbContext _db;

    public AlertaOficialServiceTests()
    {
        _conn.Open();
        _db = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }

    private sealed class FeedFalso(IReadOnlyList<AlertaCap>? alertas) : IIdapClient
    {
        public IReadOnlyList<AlertaCap>? Alertas { get; set; } = alertas;
        public Task<IReadOnlyList<AlertaCap>?> ObterAsync(CancellationToken ct = default) => Task.FromResult(Alertas);
    }

    private static IReadOnlyList<AlertaCap> Amostra(bool comCancel = true)
    {
        var todos = IdapClient.Parse(File.OpenRead(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", "idap-amostra.xml")));
        return comCancel ? todos : todos.Where(a => a.TipoMensagem != "Cancel").ToList();
    }

    private AlertaOficialService Servico(IIdapClient feed)
        => new(_db, feed, new GradeCelulas(NullLogger<GradeCelulas>.Instance), NullLogger<AlertaOficialService>.Instance);

    // O ID da Sé no seed: o teste confere antes de usar.
    [Fact]
    public async Task Seed_TemSeESantosComOsIdsEsperados()
    {
        (await _db.Subprefeituras.FindAsync(Se))!.Nome.Should().Be("Sé");
        (await _db.Subprefeituras.FindAsync(Santos))!.Nome.Should().Be("Santos");
    }

    [Fact]
    public async Task Sincronizar_GravaSoOQueAtingeAreasDoPulsar()
    {
        var r = await Servico(new FeedFalso(Amostra(comCancel: false))).SincronizarAsync(Agora);

        r.Ok.Should().BeTrue();
        r.Novos.Should().Be(2); // capital (polígono sobre a Sé) e Santos (IBGE); o do interior fica de fora
        r.HaAlertaSp.Should().BeTrue();
        var ativos = await Servico(new FeedFalso([])).AtivosPorAreaAsync(Agora);
        ativos[Se].Single().Identificador.Should().Be("198700/2026");
        ativos[Santos].Single().Gravidade.Should().Be("Extreme");
    }

    // Lido de novo a cada ciclo, o mesmo alerta não duplica.
    [Fact]
    public async Task Sincronizar_DuasVezes_UmRegistroSo()
    {
        var feed = new FeedFalso(Amostra(comCancel: false));
        await Servico(feed).SincronizarAsync(Agora);
        var segunda = await Servico(feed).SincronizarAsync(Agora.AddMinutes(5));

        segunda.Novos.Should().Be(0);
        (await _db.AlertasOficiais.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task Cancel_TiraOAlertaDosAtivos()
    {
        await Servico(new FeedFalso(Amostra(comCancel: false))).SincronizarAsync(Agora);
        var r = await Servico(new FeedFalso(Amostra())).SincronizarAsync(Agora.AddMinutes(5));

        r.Cancelados.Should().Be(1);
        var ativos = await Servico(new FeedFalso([])).AtivosPorAreaAsync(Agora.AddMinutes(5));
        ativos.Should().NotContainKey(Se);
        ativos.Should().ContainKey(Santos);
    }

    [Fact]
    public async Task Expirado_NaoApareceNosAtivos()
    {
        await Servico(new FeedFalso(Amostra(comCancel: false))).SincronizarAsync(Agora);

        (await Servico(new FeedFalso([])).AtivosPorAreaAsync(new DateTime(2026, 11, 18, 23, 30, 0, DateTimeKind.Utc)))
            .Should().BeEmpty();
    }

    // Feed fora do ar: nada é apagado, e o que estava gravado continua valendo até a validade.
    [Fact]
    public async Task FeedFora_NaoApagaNada()
    {
        await Servico(new FeedFalso(Amostra(comCancel: false))).SincronizarAsync(Agora);
        var r = await Servico(new FeedFalso(null)).SincronizarAsync(Agora.AddMinutes(5));

        r.Ok.Should().BeFalse();
        (await Servico(new FeedFalso([])).AtivosPorAreaAsync(Agora.AddMinutes(5)))
            .SelectMany(kv => kv.Value).Select(a => a.Identificador).Distinct().Should().HaveCount(2);
        (await _db.ExecucoesSincronizacao.Where(e => e.Fonte == ExecucaoSincronizacao.FonteIdap).CountAsync()).Should().Be(2);
    }

    // Revisão de segurança: um texto maior que a coluna faz o Postgres recusar o lote inteiro, e um
    // único alerta assim calaria todos os outros a cada ciclo. O texto é cortado no limite.
    [Fact]
    public async Task TextosGrandes_SaoCortadosNoLimiteDaColuna_EIdentificadorVazioCai()
    {
        var santos = Amostra(comCancel: false).Single(a => a.Identificador == "198701/2026");
        var gigante = santos with { Identificador = "999/2026", Descricao = new string('x', 10_000), Titulo = new string('y', 2_000), Emissor = new string('z', 500) };
        var semId = santos with { Identificador = "" };

        await Servico(new FeedFalso([gigante, semId])).SincronizarAsync(Agora);

        var gravado = await _db.AlertasOficiais.SingleAsync();
        gravado.Identificador.Should().Be("999/2026");
        gravado.Descricao.Length.Should().Be(4000);
        gravado.Titulo.Length.Should().Be(500);
        gravado.Emissor.Length.Should().Be(200);
    }

    // Cortar no meio de um emoji deixa meio caractere (surrogate solto), que o Postgres recusa em UTF-8.
    [Fact]
    public async Task Corte_NaoPartEmojiAoMeio()
    {
        var santos = Amostra(comCancel: false).Single(a => a.Identificador == "198701/2026");
        // O 🌧 ocupa dois chars (3999 e 4000): o corte em 4000 cairia entre eles.
        var comEmoji = santos with { Descricao = new string('x', 3999) + "🌧️ fim" };

        await Servico(new FeedFalso([comEmoji])).SincronizarAsync(Agora);

        var d = (await _db.AlertasOficiais.SingleAsync()).Descricao;
        d.Length.Should().BeLessThanOrEqualTo(4000);
        char.IsHighSurrogate(d[^1]).Should().BeFalse();
        FluentActions.Invoking(() => new System.Text.UTF8Encoding(false, true).GetBytes(d)).Should().NotThrow();
    }

    [Fact]
    public async Task AlertaVencidoHaMaisDe30Dias_EApagado()
    {
        await Servico(new FeedFalso(Amostra(comCancel: false))).SincronizarAsync(Agora);
        await Servico(new FeedFalso([])).SincronizarAsync(Agora.AddDays(31));

        (await _db.AlertasOficiais.CountAsync()).Should().Be(0);
    }

    // Extremo novo avisa no ciclo da leitura (E4b): o serviço diz quantos extremos entraram agora.
    [Fact]
    public async Task Sincronizar_ContaOsExtremosNovos()
    {
        var feed = new FeedFalso(Amostra(comCancel: false));
        (await Servico(feed).SincronizarAsync(Agora)).NovosExtremos.Should().Be(1); // Santos
        (await Servico(feed).SincronizarAsync(Agora.AddMinutes(5))).NovosExtremos.Should().Be(0);
    }

    // Extremo com início marcado para depois da leitura: o motor só o vê a partir do início, então
    // a chamada na hora vale na primeira leitura depois que ele passa a valer, e só nela.
    [Fact]
    public async Task Sincronizar_ExtremoComInicioFuturo_ContaNaLeituraEmQueComecaAValer()
    {
        var feed = new FeedFalso(Amostra(comCancel: false));
        var antes = new DateTime(2026, 11, 18, 17, 0, 0, DateTimeKind.Utc); // a amostra começa às 17:05Z
        (await Servico(feed).SincronizarAsync(antes)).NovosExtremos.Should().Be(0);
        (await Servico(feed).SincronizarAsync(antes.AddMinutes(10))).NovosExtremos.Should().Be(1);
        (await Servico(feed).SincronizarAsync(antes.AddMinutes(15))).NovosExtremos.Should().Be(0);
    }
}
