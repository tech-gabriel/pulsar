using FluentAssertions;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class GeoDistanciaTests
{
    [Fact]
    public void MesmoPonto_RetornaZero()
    {
        GeoDistancia.HaversineMetros(-23.55, -46.63, -23.55, -46.63)
            .Should().BeApproximately(0, 0.001);
    }

    [Fact]
    public void UmGrauDeLatitude_EhCercaDe111Km()
    {
        // 1° de latitude ≈ 111.195 km em qualquer longitude.
        var metros = GeoDistancia.HaversineMetros(-23.0, -46.63, -24.0, -46.63);
        metros.Should().BeApproximately(111_195, 500);
    }

    [Fact]
    public void PontosProximos_DistanciaEsperada()
    {
        // Dois pontos ~370 m em Vila Prudente (amostra real do GeoSampa).
        var metros = GeoDistancia.HaversineMetros(-23.60621642, -46.5368208, -23.60900, -46.53900);
        metros.Should().BeInRange(300, 450);
    }
}
