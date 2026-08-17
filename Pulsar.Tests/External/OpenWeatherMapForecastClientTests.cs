using FluentAssertions;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.External;

public class OpenWeatherMapForecastClientTests
{
    // Payload reduzido do /data/2.5/forecast com units=metric. Três pontos de propósito:
    // um com chuva e rajada, um SEM o objeto `rain`, e um SEM `wind.gust`. Os dois
    // últimos são os casos que quebram em produção e passam num teste ingênuo.
    private const string JsonExemplo = """
        {
          "cod": "200",
          "cnt": 3,
          "list": [
            {
              "dt": 1786989600,
              "main": { "temp": 19.4, "humidity": 88 },
              "weather": [ { "id": 502, "main": "Rain", "description": "chuva forte" } ],
              "wind": { "speed": 5.0, "deg": 200, "gust": 11.0 },
              "visibility": 6000,
              "pop": 0.82,
              "rain": { "3h": 14.2 },
              "dt_txt": "2026-08-17 18:00:00"
            },
            {
              "dt": 1787000400,
              "main": { "temp": 17.1, "humidity": 80 },
              "weather": [ { "id": 802, "main": "Clouds", "description": "nuvens dispersas" } ],
              "wind": { "speed": 2.5, "deg": 180, "gust": 4.0 },
              "visibility": 10000,
              "pop": 0.11,
              "dt_txt": "2026-08-17 21:00:00"
            },
            {
              "dt": 1787011200,
              "main": { "temp": 15.8, "humidity": 90 },
              "weather": [ { "id": 500, "main": "Rain", "description": "chuva leve" } ],
              "wind": { "speed": 1.5, "deg": 170 },
              "visibility": 9000,
              "pop": 0.35,
              "rain": { "3h": 0.8 },
              "dt_txt": "2026-08-18 00:00:00"
            }
          ]
        }
        """;

    [Fact]
    public void ParseForecast_PayloadValido_RetornaTodosOsPontos()
    {
        OpenWeatherMapForecastClient.ParseForecast(JsonExemplo).Should().HaveCount(3);
    }

    [Fact]
    public void ParseForecast_ConverteDtParaInstanteUtc()
    {
        var ponto = OpenWeatherMapForecastClient.ParseForecast(JsonExemplo)[0];

        // O Kind precisa ser Utc: o Npgsql recusa Local ou Unspecified ao gravar em
        // timestamptz, e o SQLite dos testes aceitaria qualquer um.
        ponto.InstantePrevisto.Should().Be(new DateTime(2026, 8, 17, 18, 0, 0, DateTimeKind.Utc));
        ponto.InstantePrevisto.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void ParseForecast_MapeiaChuvaProbabilidadeECondicao()
    {
        var ponto = OpenWeatherMapForecastClient.ParseForecast(JsonExemplo)[0];

        ponto.ChuvaMm.Should().Be(14.2);
        ponto.ProbabilidadeChuva.Should().Be(0.82);
        ponto.CondicaoCodigo.Should().Be(502);
        ponto.CondicaoDescricao.Should().Be("chuva forte");
        ponto.TemperaturaC.Should().Be(19.4);
    }

    [Fact]
    public void ParseForecast_ConverteVentoDeMetrosPorSegundoParaKmH()
    {
        var ponto = OpenWeatherMapForecastClient.ParseForecast(JsonExemplo)[0];

        ponto.VentoKmH.Should().BeApproximately(18.0, 0.01);   // 5.0 m/s
        ponto.RajadaKmH.Should().BeApproximately(39.6, 0.01);  // 11.0 m/s
    }

    [Fact]
    public void ParseForecast_SemObjetoRain_ChuvaEhZero()
    {
        var ponto = OpenWeatherMapForecastClient.ParseForecast(JsonExemplo)[1];

        ponto.ChuvaMm.Should().Be(0, "a API omite `rain` quando não chove na faixa");
    }

    [Fact]
    public void ParseForecast_SemGust_RajadaEhNula()
    {
        var ponto = OpenWeatherMapForecastClient.ParseForecast(JsonExemplo)[2];

        ponto.RajadaKmH.Should().BeNull("a API omite `wind.gust` às vezes");
    }

    [Fact]
    public void ParseForecast_ListaVazia_RetornaVazio()
    {
        OpenWeatherMapForecastClient.ParseForecast("""{ "cod": "200", "cnt": 0, "list": [] }""")
            .Should().BeEmpty();
    }
}
