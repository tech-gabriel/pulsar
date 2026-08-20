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

/// <summary>
/// O ponto em que o motor de notificações entra no ciclo de coleta. O que estes testes
/// protegem é o CONTRATO da chamada, não o motor em si: uma vez por ciclo, depois dos
/// alertas, contida em try/catch e pulada quando o ciclo foi cancelado no meio.
/// </summary>
public class ColetaRunnerMotorTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static ColetaRunner NovoRunner(
        PulsarDbContext ctx, IMotorNotificacoes motor, IAlertaService? alerta = null)
        => new(
            Mock.Of<IClimateService>(),
            Mock.Of<IScoreService>(),
            alerta ?? Mock.Of<IAlertaService>(),
            Mock.Of<IAgregadoDiarioService>(),
            Mock.Of<IPrevisaoService>(),
            motor,
            ctx,
            NullLogger<ColetaRunner>.Instance);

    [Fact]
    public async Task ExecutarCiclo_ChamaOMotorUmaVezSo()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        // Mais de uma região no seed: se a chamada estivesse dentro do loop de regiões,
        // este Times.Once viraria Times.Exactly(regioes).
        (await ctx.Regioes.CountAsync()).Should().BeGreaterThan(1);

        var motor = new Mock<IMotorNotificacoes>();
        var runner = NovoRunner(ctx, motor.Object);

        await runner.ExecutarCicloAsync();

        motor.Verify(m => m.AvaliarEDispararAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecutarCiclo_ChamaOMotorDepoisDosAlertas()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        // O motor lê estado consolidado do banco (scores, previsão, alertas). Chamá-lo
        // antes do loop de alertas o faria decidir sobre o ciclo anterior.
        var ordem = new List<string>();

        var alerta = new Mock<IAlertaService>();
        alerta.Setup(a => a.GerarAlertaAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
              .Callback(() => ordem.Add("alerta"))
              .ReturnsAsync((Alerta?)null);

        var motor = new Mock<IMotorNotificacoes>();
        motor.Setup(m => m.AvaliarEDispararAsync(It.IsAny<CancellationToken>()))
             .Callback(() => ordem.Add("motor"))
             .ReturnsAsync(0);

        var runner = NovoRunner(ctx, motor.Object, alerta.Object);

        await runner.ExecutarCicloAsync();

        ordem.Should().Contain("alerta");
        ordem[^1].Should().Be("motor");
    }

    [Fact]
    public async Task ExecutarCiclo_MotorLancando_NaoDerrubaOCiclo()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        var ativas = await ctx.Subprefeituras.CountAsync(s => s.Ativa);

        var motor = new Mock<IMotorNotificacoes>();
        motor.Setup(m => m.AvaliarEDispararAsync(It.IsAny<CancellationToken>()))
             .ThrowsAsync(new InvalidOperationException("banco fora do ar"));

        var runner = NovoRunner(ctx, motor.Object);

        var resultado = await runner.ExecutarCicloAsync();

        // O ciclo é a única memória de longo prazo do sistema (score e agregado diário):
        // uma falha do motor não pode impedi-lo de concluir e devolver o resumo.
        resultado.Should().NotBeNull();
        resultado.SubprefeiturasProcessadas.Should().Be(ativas);
    }

    [Fact]
    public async Task ExecutarCiclo_CancelamentoNoMeio_NaoChamaOMotor()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        using var cts = new CancellationTokenSource();

        // Cancela durante o loop de alertas, que é o desligamento do serviço no meio do
        // ciclo: os loops quebram e o banco fica com estado PELA METADE. Decidir push em
        // cima disso é decidir sobre dado que ainda não terminou de ser escrito.
        var alerta = new Mock<IAlertaService>();
        alerta.Setup(a => a.GerarAlertaAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
              .Callback(() => cts.Cancel())
              .ReturnsAsync((Alerta?)null);

        var motor = new Mock<IMotorNotificacoes>();
        var runner = NovoRunner(ctx, motor.Object, alerta.Object);

        await runner.ExecutarCicloAsync(cts.Token);

        motor.Verify(m => m.AvaliarEDispararAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
