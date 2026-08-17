using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class PrevisaoServiceTests
{
    private readonly Mock<IForecastClient> _forecastMock = new();

    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private PrevisaoService NovoServico(PulsarDbContext ctx)
        => new(
            new SubprefeituraRepository(ctx),
            new PrevisaoRepository(ctx),
            _forecastMock.Object,
            NullLogger<PrevisaoService>.Instance);

    /// <summary>
    /// Ponto de previsão de mentira. O código da condição sai da intensidade da chuva
    /// (500 = chuva leve, 502 = chuva forte, como na API), e não de um valor fixo, para
    /// que a assertiva de "a condição vem da sub de pior chuva" consiga de fato falhar.
    /// </summary>
    private static PontoPrevisaoDto Ponto(DateTime instanteUtc, double chuva = 0, double pop = 0, double vento = 10)
        => new()
        {
            InstantePrevisto = instanteUtc,
            ChuvaMm = chuva,
            ProbabilidadeChuva = pop,
            VentoKmH = vento,
            RajadaKmH = vento * 1.5,
            TemperaturaC = 20,
            CondicaoCodigo = chuva >= 10 ? 502 : chuva > 0 ? 500 : 800,
            CondicaoDescricao = chuva >= 10 ? "chuva forte" : chuva > 0 ? "chuva leve" : "céu limpo",
        };

    [Fact]
    public async Task AtualizarAsync_SemDadoAnterior_ChamaApiEPersiste()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();

        _forecastMock
            .Setup(c => c.ObterPrevisaoAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Ponto(DateTime.UtcNow.AddHours(3), chuva: 5)]);

        var chamou = await NovoServico(ctx).AtualizarAsync(subId);

        chamou.Should().BeTrue();
        (await ctx.PrevisoesClimaticas.CountAsync(p => p.SubprefeituraId == subId)).Should().Be(1);
    }

    [Fact]
    public async Task AtualizarAsync_DadoComMenosDe55Minutos_NaoChamaApi()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();

        // 54 min encosta na guarda de propósito: junto com o teste de 56 min, o par
        // prende a guarda em 55. Com 30 min, afrouxar a guarda para 60 passaria batido.
        await new PrevisaoRepository(ctx).UpsertLoteAsync(
            subId, [Ponto(DateTime.UtcNow.AddHours(3))], DateTime.UtcNow.AddMinutes(-54));

        // Stub de lista vazia justamente para a chamada que NÃO deve acontecer: sem ele,
        // uma guarda frouxa quebraria com NullReferenceException em vez de acusar a
        // assertiva, e o motivo real da falha ficaria escondido.
        _forecastMock
            .Setup(c => c.ObterPrevisaoAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var chamou = await NovoServico(ctx).AtualizarAsync(subId);

        chamou.Should().BeFalse();
        _forecastMock.Verify(
            c => c.ObterPrevisaoAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AtualizarAsync_DadoComMaisDe55Minutos_ChamaApi()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();

        await new PrevisaoRepository(ctx).UpsertLoteAsync(
            subId, [Ponto(DateTime.UtcNow.AddHours(3))], DateTime.UtcNow.AddMinutes(-56));

        _forecastMock
            .Setup(c => c.ObterPrevisaoAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Ponto(DateTime.UtcNow.AddHours(3), chuva: 9)]);

        var chamou = await NovoServico(ctx).AtualizarAsync(subId);

        chamou.Should().BeTrue();
    }

    [Fact]
    public async Task AtualizarAsync_AplicaRetencaoDoPassado()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();
        var agora = DateTime.UtcNow;

        // Semeia um ponto bem velho com coleta velha (para não cair na guarda).
        await new PrevisaoRepository(ctx).UpsertLoteAsync(
            subId, [Ponto(agora.AddHours(-10))], agora.AddHours(-2));

        _forecastMock
            .Setup(c => c.ObterPrevisaoAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Ponto(agora.AddHours(3))]);

        await NovoServico(ctx).AtualizarAsync(subId);

        var restantes = await ctx.PrevisoesClimaticas.Where(p => p.SubprefeituraId == subId).ToListAsync();
        restantes.Should().HaveCount(1, "o ponto de 10h atrás está fora da janela de retenção de 3h");
        restantes[0].InstantePrevisto.Should().BeAfter(agora);
    }

    [Fact]
    public async Task AtualizarAsync_PersisteDatasEmUtc()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();

        _forecastMock
            .Setup(c => c.ObterPrevisaoAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([Ponto(DateTime.UtcNow.AddHours(3), chuva: 2)]);

        await NovoServico(ctx).AtualizarAsync(subId);

        // Lê da entidade rastreada, não do banco: o SQLite devolve Unspecified na volta e
        // apagaria o defeito. O Npgsql de produção recusa Local/Unspecified em timestamptz,
        // então essa é a única forma de o teste enxergar um DateTime.Now indevido.
        var linha = ctx.PrevisoesClimaticas.Local.Single();
        linha.ColetadoEm.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public async Task ObterFaixasRegiaoAsync_AgregaPorPiorCasoEntreSubs()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        // Duas subs da MESMA região, mesma faixa de 3h, chuvas diferentes.
        // O GroupBy roda EM MEMÓRIA de propósito: agrupar no provider e projetar
        // g.Take(2).ToList() não traduz para SQL e o EF Core lança em runtime.
        var todas = await ctx.Subprefeituras.Where(s => s.Ativa).ToListAsync();
        var subs = todas.GroupBy(s => s.RegiaoId).First(g => g.Count() >= 2).Take(2).ToList();
        var regiaoId = subs[0].RegiaoId;
        var faixa = DateTime.UtcNow.AddHours(3);
        var repo = new PrevisaoRepository(ctx);

        await repo.UpsertLoteAsync(subs[0].Id, [Ponto(faixa, chuva: 3, pop: 0.30, vento: 12)], DateTime.UtcNow);
        await repo.UpsertLoteAsync(subs[1].Id, [Ponto(faixa, chuva: 17, pop: 0.85, vento: 40)], DateTime.UtcNow);

        var faixas = await NovoServico(ctx).ObterFaixasRegiaoAsync(regiaoId, 8);

        faixas.Should().HaveCount(1);
        faixas[0].ChuvaMm.Should().Be(17);
        faixas[0].ProbabilidadeChuva.Should().Be(0.85);
        faixas[0].VentoKmH.Should().Be(40);
        faixas[0].CondicaoCodigo.Should().Be(502, "a condição vem da sub de pior chuva");
        faixas[0].CondicaoDescricao.Should().Be("chuva forte");
    }

    [Fact]
    public async Task ObterFaixasRegiaoAsync_RespeitaOLimiteDeFaixas()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var sub = await ctx.Subprefeituras.FirstAsync();
        var agora = DateTime.UtcNow;

        var pontos = Enumerable.Range(1, 12).Select(i => Ponto(agora.AddHours(i * 3))).ToList();
        await new PrevisaoRepository(ctx).UpsertLoteAsync(sub.Id, pontos, agora);

        var faixas = await NovoServico(ctx).ObterFaixasRegiaoAsync(sub.RegiaoId, 8);

        faixas.Should().HaveCount(8);
        faixas.Should().BeInAscendingOrder(f => f.InstantePrevisto);
    }

    [Fact]
    public async Task ObterFaixasRegiaoAsync_SemPrevisao_RetornaVazio()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await ctx.Regioes.Select(r => r.Id).FirstAsync();

        (await NovoServico(ctx).ObterFaixasRegiaoAsync(regiaoId, 8)).Should().BeEmpty();
    }
}
