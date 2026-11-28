using FluentAssertions;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.External;

public class OpenWeatherMapClientTests
{
    // Payload reduzido do /data/2.5/weather com units=metric.
    private static string Json(string wind) => $$"""
        {
          "main": { "temp": 19.4, "feels_like": 19.0, "humidity": 88 },
          "wind": {{wind}},
          "visibility": 6000,
          "rain": { "1h": 2.5 },
          "dt": 1786989600
        }
        """;

    [Fact]
    public void Leitura_TrazDirecaoDoVento()
    {
        var dados = OpenWeatherMapClient.ParseWeather(Json("""{ "speed": 10, "deg": 315 }"""), 0);

        dados.VentoDirecaoGraus.Should().Be(315);
        dados.VentoKmH.Should().BeApproximately(36, 0.001);
    }

    [Fact]
    public void Leitura_SemDirecao_DirecaoNula()
    {
        var dados = OpenWeatherMapClient.ParseWeather(Json("""{ "speed": 10 }"""), 0);

        dados.VentoDirecaoGraus.Should().BeNull();
    }
}
