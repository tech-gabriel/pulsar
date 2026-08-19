using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Services;

public class ColetaRunnerAgregadoTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    [Fact]
    public async Task FalhaNoAgregadoDeUmaSubprefeitura_NaoImpedeAsDemais()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        var ids = await ctx.Subprefeituras.Where(s => s.Ativa).Select(s => s.Id).ToListAsync();
        var idQueFalha = ids[0];

        var agregado = new Mock<IAgregadoDiarioService>();
        agregado.Setup(a => a.AtualizarRecentesAsync(idQueFalha, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("boom"));

        var runner = new ColetaRunner(
            Mock.Of<IClimateService>(),
            Mock.Of<IScoreService>(),
            Mock.Of<IAlertaService>(),
            agregado.Object,
            Mock.Of<IPrevisaoService>(),
            Mock.Of<IMotorNotificacoes>(),
            ctx,
            NullLogger<ColetaRunner>.Instance);

        var resultado = await runner.ExecutarCicloAsync();

        // O ciclo termina normalmente e todas as outras subprefeituras foram agregadas.
        resultado.Should().NotBeNull();
        agregado.Verify(a => a.AtualizarRecentesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Exactly(ids.Count));
    }
}
