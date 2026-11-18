using FluentAssertions;
using Pulsar.API.Domain.Alertas;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Domain;

/// <summary>Leitura adaptativa (decisão do user, 18/11): 5 min quando há algo acontecendo, 15 min no calmo.</summary>
public class RitmoAlertasTests
{
    private static readonly ResultadoSincronizacao Ok = new(true, 0, 0, false);
    private static readonly ResultadoSincronizacao OkComSp = new(true, 0, 0, true);

    [Fact]
    public void Calmo_15Min() => RitmoAlertas.Proximo(Ok, haAlertaAtivoNasAreas: false, haChuvaMedida: false).Should().Be(TimeSpan.FromMinutes(15));

    [Fact]
    public void AlertaAtivoNumaArea_5Min() => RitmoAlertas.Proximo(Ok, true, false).Should().Be(TimeSpan.FromMinutes(5));

    [Fact]
    public void AlertaDeSpNoFeed_5Min() => RitmoAlertas.Proximo(OkComSp, false, false).Should().Be(TimeSpan.FromMinutes(5));

    [Fact]
    public void ChuvaMedida_5Min() => RitmoAlertas.Proximo(Ok, false, true).Should().Be(TimeSpan.FromMinutes(5));

    // Feed fora do ar: insistir a cada 5 min só gasta banda; o que já estava gravado continua valendo.
    [Fact]
    public void FeedFora_15MinMesmoComChuva()
        => RitmoAlertas.Proximo(new ResultadoSincronizacao(false, 0, 0, false), true, true).Should().Be(TimeSpan.FromMinutes(15));
}
