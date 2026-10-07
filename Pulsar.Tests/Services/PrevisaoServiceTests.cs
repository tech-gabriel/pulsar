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

}
