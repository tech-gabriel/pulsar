using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
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
        score.Setup(x => x.CalcularEPersistirAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(new ScorePerigo());
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
        celulas.Setup(c => c.RegistrarAsync(It.IsAny<Subprefeitura>(), It.IsAny<ScorePerigo>(), It.IsAny<CancellationToken>()))
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

        celulas.Verify(c => c.RegistrarAsync(It.IsAny<Subprefeitura>(), It.IsAny<ScorePerigo>(), It.IsAny<CancellationToken>()), Times.Exactly(areas));
        celulas.Verify(c => c.PodarAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // Sem score não há chuva de onde partir: o trecho não é calculado para a área.
    [Fact]
    public async Task Executar_ScoreFalhou_NaoCalculaCelulasDaArea()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        var celulas = new Mock<IRiscoCelulasService>();
        var (runner, score, _) = Montar(conn, celulas);
        score.Setup(x => x.CalcularEPersistirAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ThrowsAsync(new InvalidOperationException("sem leitura"));

        await runner.ExecutarCicloAsync();

        celulas.Verify(c => c.RegistrarAsync(It.IsAny<Subprefeitura>(), It.IsAny<ScorePerigo>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // O ciclo automático e a coleta forçada pelo admin dividem as mesmas tabelas. Juntos,
    // um gravava por cima do outro (chave duplicada no agregado diário) e o ciclo perdia
    // score, agregado e previsão de várias áreas. Um ciclo espera o outro terminar.
    [Fact]
    public async Task Executar_DoisCiclosAoMesmoTempo_RodamUmDepoisDoOutro()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        int dentro = 0, maximo = 0;
        var clima = new Mock<IClimateService>();
        clima.Setup(c => c.ColetarTodasAsync(It.IsAny<CancellationToken>())).Returns(async () =>
        {
            maximo = Math.Max(maximo, Interlocked.Increment(ref dentro));
            await Task.Delay(150);
            Interlocked.Decrement(ref dentro);
        });
        ColetaRunner Novo()
        {
            var ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options);
            ctx.Database.EnsureCreated();
            ctx.Subprefeituras.ExecuteUpdate(u => u.SetProperty(x => x.Ativa, false)); // só a coleta interessa aqui
            return new ColetaRunner(
                clima.Object, Mock.Of<IScoreService>(), Mock.Of<IAgregadoDiarioService>(), Mock.Of<IPrevisaoService>(),
                Mock.Of<IAlagamentoCgeService>(), Mock.Of<IEstacaoCgeService>(), Mock.Of<ICemadenService>(),
                Mock.Of<IMotorNotificacoes>(), Mock.Of<IAvisoRotaService>(), Mock.Of<IRiscoCelulasService>(),
                ctx, NullLogger<ColetaRunner>.Instance);
        }
        var (a, b) = (Novo(), Novo());

        await Task.WhenAll(Task.Run(() => a.ExecutarCicloAsync()), Task.Run(() => b.ExecutarCicloAsync()));

        maximo.Should().Be(1);
        clima.Verify(c => c.ColetarTodasAsync(It.IsAny<CancellationToken>()), Times.Exactly(2));
    }
}
