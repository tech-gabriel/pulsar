using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Pulsar.API.Domain.Chuva;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class AlagamentoLugarTests : IDisposable
{
    private const double GrauPorKm = 1 / 111.0;
    private static readonly DateTime Agora = new(2026, 11, 14, 18, 0, 0, DateTimeKind.Utc);

    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly PulsarDbContext _ctx;
    private readonly Subprefeitura _mooca;
    private readonly List<EstacaoChuva> _estacoes = [];

    public AlagamentoLugarTests()
    {
        _conn.Open();
        _ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(_conn).Options);
        _ctx.Database.EnsureCreated();
        _mooca = _ctx.Subprefeituras.First(s => s.Nome == "Mooca");
    }

    public void Dispose()
    {
        _ctx.Dispose();
        _conn.Dispose();
    }

    private static readonly double FatorDaArea = CalibracaoScore.Atual.Fator("Mooca");

    /// <summary>Trecho na Mooca; por padrão sem histórico próprio (fator igual ao da área).</summary>
    private static CelulaGrade Trecho(double? fator = null, string h3 = "c1") => new(h3, -23.55, -46.6, "Mooca", fator ?? FatorDaArea);

    private void Estacao(double km, double mm1h, double mm3h, double? mm48h = null)
        => _estacoes.Add(new EstacaoChuva("E", -23.55 + km * GrauPorKm, -46.6, mm1h, mm3h, mm48h));

    private async Task ModeloComChuvaAsync(double chuvaMmH)
    {
        _ctx.LeiturasClimaticas.AddRange(Enumerable.Range(0, 12).Select(i => new LeituraClimatica
        {
            SubprefeituraId = _mooca.Id, ChuvaMmH = chuvaMmH, VisibilidadeKm = 10, SensacaoTermica = 20,
            Timestamp = DateTime.UtcNow.AddMinutes(-15 * i),
        }));
        await _ctx.SaveChangesAsync();
    }

    private async Task<IReadOnlyList<NotificacaoPendente>> Avaliar(params CelulaGrade[] celulas)
    {
        var cemaden = new Mock<ICemadenService>();
        cemaden.Setup(c => c.ObterEstacoesComChuvaAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ReturnsAsync(_estacoes);
        return await new AlagamentoLugar(_ctx, Mock.Of<IGradeCelulas>(), cemaden.Object).AvaliarAsync(celulas, Agora);
    }

    // O caso que justifica o aviso: o modelo não viu a chuva, a estação do trecho mediu.
    [Fact]
    public async Task EstacaoComChuvaForteEModeloSeco_AvisaComOQueFoiMedido()
    {
        Estacao(km: 1.2, mm1h: 30, mm3h: 42.4, mm48h: 60);

        var p = (await Avaliar(Trecho())).Should().ContainSingle().Subject;

        p.Gatilho.Should().Be("alagamento-lugar");
        p.Celula.Should().Be("c1");
        p.SubprefeituraId.Should().Be(_mooca.Id);
        p.Local.Should().Be("Mooca");
        p.Criterio.Should().Be(CriterioOptIn.RiscoAlto);
        p.Perigo.Should().Be(TipoPerigo.ALAGAMENTO);
        p.Prioridade.Should().Be(LimiaresNotificacao.PrioridadeScoreAlto);
        p.Cooldown.Should().Be(LimiaresNotificacao.CooldownScoreAlto);
        p.Chave.Should().Be("lugar:c1:202611141800");
        p.Payload.Corpo.Should().Be("Choveu 42,4 mm nas últimas 3 horas, medidos a 1,2 km. Toque para ver no mapa.");
    }

    [Fact]
    public async Task TrechoComHistoricoDeAlagamento_DizQueCostumaAlagar()
    {
        Estacao(km: 1.2, mm1h: 30, mm3h: 42.4, mm48h: 60);

        var p = (await Avaliar(Trecho(fator: FatorDaArea * 1.2))).Should().ContainSingle().Subject;

        p.Payload.Corpo.Should().Be("Choveu 42,4 mm nas últimas 3 horas, medidos a 1,2 km. Esse trecho costuma alagar. Toque para ver no mapa.");
    }

    // A medida manda: chuva inventada pelo modelo não vira alerta na casa de ninguém.
    [Fact]
    public async Task EstacaoSecaEModeloComChuvaForte_NaoAvisa()
    {
        await ModeloComChuvaAsync(30);
        Estacao(km: 1.2, mm1h: 0, mm3h: 0, mm48h: 0);

        (await Avaliar(Trecho())).Should().BeEmpty();
    }

    // Sem estação por perto o aviso do lugar não existe; a pessoa segue com os avisos da área.
    [Fact]
    public async Task SemEstacaoPerto_NaoAvisaMesmoComModeloEmAlerta()
    {
        await ModeloComChuvaAsync(30);
        Estacao(km: RiscoTrecho.RaioEstacaoKm + 1, mm1h: 30, mm3h: 42.4, mm48h: 60);

        (await Avaliar(Trecho())).Should().BeEmpty();
    }

    [Fact]
    public async Task ChuvaMedidaFraca_NaoAvisa()
    {
        Estacao(km: 1.2, mm1h: 2, mm3h: 4, mm48h: 4);

        (await Avaliar(Trecho())).Should().BeEmpty();
    }

    [Fact]
    public async Task DoisTrechosEmAlerta_UmaPendenciaPorTrecho()
    {
        Estacao(km: 1.2, mm1h: 30, mm3h: 42.4, mm48h: 60);

        (await Avaliar(Trecho(h3: "c1"), Trecho(h3: "c2"))).Select(p => p.Celula).Should().BeEquivalentTo(["c1", "c2"]);
    }

    [Fact]
    public async Task SemTrechos_NemConsultaAsEstacoes()
    {
        var cemaden = new Mock<ICemadenService>(MockBehavior.Strict);

        (await new AlagamentoLugar(_ctx, Mock.Of<IGradeCelulas>(), cemaden.Object).AvaliarAsync([], Agora)).Should().BeEmpty();
    }
}
