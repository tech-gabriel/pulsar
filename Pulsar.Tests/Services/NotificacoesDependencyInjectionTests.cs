using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Services;

/// <summary>
/// Guarda o registro no container REAL, e não em construtor de teste. O motor recebe
/// <c>IEnumerable&lt;IGatilhoNotificacao&gt;</c>: um gatilho que exista mas não esteja
/// registrado contra essa interface exata não gera erro nenhum, o motor apenas roda com a
/// lista mais curta e o alerta some em silêncio, ciclo após ciclo. Nenhum teste do motor
/// pega isso, porque todos passam os gatilhos direto pelo construtor.
/// </summary>
public class NotificacoesDependencyInjectionTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly PulsarWebApplicationFactory _factory;

    public NotificacoesDependencyInjectionTests(PulsarWebApplicationFactory factory)
        => _factory = factory;

    [Fact]
    public void ContainerReal_EntregaOsTresGatilhosPelaInterface()
    {
        using var scope = _factory.Services.CreateScope();

        var gatilhos = scope.ServiceProvider.GetServices<IGatilhoNotificacao>().ToList();

        // ContainSingle e não Contain: registro duplicado avaliaria o mesmo gatilho duas
        // vezes por ciclo, e as duas pendências gêmeas competiriam pela vaga do ciclo.
        gatilhos.Should().ContainSingle(g => g is GatilhoScoreAlto);
        gatilhos.Should().ContainSingle(g => g is GatilhoChuvaPrevista);
        gatilhos.Should().ContainSingle(g => g is GatilhoBriefingDiario);
    }

    [Fact]
    public void ContainerReal_ResolveOMotorComTodasAsDependencias()
    {
        using var scope = _factory.Services.CreateScope();

        var motor = scope.ServiceProvider.GetRequiredService<IMotorNotificacoes>();

        motor.Should().BeOfType<MotorNotificacoes>();
    }
}
