using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Services;

public class ColetaRunnerCelulasTests
{
    private static (ColetaRunner Runner, Mock<IScoreService> Score, int Areas) Montar(
        SqliteConnection conn, Mock<IRiscoCelulasService> celulas)
    {
        var ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options);
        ctx.Database.EnsureCreated();
        var score = new Mock<IScoreService>();
        var runner = new ColetaRunner(
            Mock.Of<IClimateService>(), score.Object, Mock.Of<IAgregadoDiarioService>(), Mock.Of<IPrevisaoService>(),
            Mock.Of<IAlagamentoCgeService>(), Mock.Of<IEstacaoCgeService>(), Mock.Of<ICemadenService>(),
            Mock.Of<IMotorNotificacoes>(), Mock.Of<IAvisoRotaService>(), celulas.Object,
            ctx, NullLogger<ColetaRunner>.Instance);
        return (runner, score, ctx.Subprefeituras.Count(s => s.Ativa));
    }

    [Fact]
    public async Task Executar_FalhaNasCelulas_NaoDerrubaOCiclo()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        var celulas = new Mock<IRiscoCelulasService>();
        celulas.Setup(c => c.RegistrarAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new InvalidOperationException("boom"));
        celulas.Setup(c => c.PodarAsync(It.IsAny<CancellationToken>()))
               .ThrowsAsync(new InvalidOperationException("boom"));
        var (runner, score, areas) = Montar(conn, celulas);

        var resultado = await runner.ExecutarCicloAsync();

        resultado.ScoresCalculados.Should().Be(areas);
        score.Verify(s => s.CalcularEPersistirAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Exactly(areas));
    }

    [Fact]
    public async Task Executar_ChamaCelulasParaCadaAreaEPodaUmaVez()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        var celulas = new Mock<IRiscoCelulasService>();
        var (runner, _, areas) = Montar(conn, celulas);

        await runner.ExecutarCicloAsync();

        celulas.Verify(c => c.RegistrarAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Exactly(areas));
        celulas.Verify(c => c.PodarAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
