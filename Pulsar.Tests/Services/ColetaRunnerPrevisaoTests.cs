using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Services;

public class ColetaRunnerPrevisaoTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    [Fact]
    public async Task ExecutarCiclo_ChamaPrevisaoParaCadaSubprefeituraAtiva()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        var ativas = await ctx.Subprefeituras.CountAsync(s => s.Ativa);
        var previsao = new Mock<IPrevisaoService>();

        var runner = new ColetaRunner(
            Mock.Of<IClimateService>(),
            Mock.Of<IScoreService>(),
            Mock.Of<IAlertaService>(),
            Mock.Of<IAgregadoDiarioService>(),
            previsao.Object,
            Mock.Of<IMotorNotificacoes>(),
            ctx,
            NullLogger<ColetaRunner>.Instance);

        await runner.ExecutarCicloAsync();

        previsao.Verify(
            p => p.AtualizarAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Exactly(ativas));
    }

    [Fact]
    public async Task ExecutarCiclo_PrevisaoLancandoEmUmaSub_NaoImpedeAsDemais()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        var ids = await ctx.Subprefeituras.Where(s => s.Ativa).Select(s => s.Id).ToListAsync();
        var previsao = new Mock<IPrevisaoService>();
        previsao
            .Setup(p => p.AtualizarAsync(ids[0], It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var runner = new ColetaRunner(
            Mock.Of<IClimateService>(),
            Mock.Of<IScoreService>(),
            Mock.Of<IAlertaService>(),
            Mock.Of<IAgregadoDiarioService>(),
            previsao.Object,
            Mock.Of<IMotorNotificacoes>(),
            ctx,
            NullLogger<ColetaRunner>.Instance);

        var resultado = await runner.ExecutarCicloAsync();

        resultado.Should().NotBeNull();
        resultado.ScoresCalculados.Should().Be(ids.Count,
            "a falha da previsão não pode descartar o score já gravado");
        previsao.Verify(
            p => p.AtualizarAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Exactly(ids.Count));
    }
}
