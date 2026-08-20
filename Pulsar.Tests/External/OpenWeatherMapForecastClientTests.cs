using System.Globalization;
using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
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

    // --- ObterPrevisaoAsync ---
    //
    // O resto do arquivo testa ParseForecast direto, que é o padrão dos clientes daqui
    // (mesmo motivo de CgespNoticiaClient.ParseRss ser público e estático): parse não
    // precisa de HttpClient. O que aquele padrão NÃO alcança é a URL, e a URL carrega duas
    // decisões que somem em silêncio: sem `units=metric` a API responde em Kelvin, e sem
    // `lang=pt_br` a `description` volta em inglês dentro de um app em português, indo
    // parar no leitor de tela pelo span sr-only. Por isso, e só por isso, aqui entra um
    // handler falso.

    /// <summary>
    /// Handler falso: guarda a URI pedida e devolve a resposta combinada, sem rede.
    /// </summary>
    private sealed class HandlerFalso : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly string _corpo;

        public HandlerFalso(HttpStatusCode status, string corpo)
        {
            _status = status;
            _corpo = corpo;
        }

        public Uri? UriPedida { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            UriPedida = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(_status)
            {
                Content = new StringContent(_corpo),
            });
        }
    }

    /// <summary>
    /// O cliente resolve o HttpClient pela fábrica nomeada, então é a fábrica que injeta o
    /// handler falso. A BaseAddress precisa ser a mesma do Program.cs porque o cliente pede
    /// um caminho relativo ("forecast?..."), e sem base a chamada nem sairia.
    /// </summary>
    private sealed class FabricaFalsa : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public FabricaFalsa(HttpMessageHandler handler) => _handler = handler;

        public HttpClient CreateClient(string name)
            => new(_handler, disposeHandler: false)
            {
                BaseAddress = new Uri("https://api.openweathermap.org/data/2.5/"),
            };
    }

    private static OpenWeatherMapForecastClient ClienteCom(HttpMessageHandler handler)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenWeatherMap:ApiKey"] = "chave-de-teste",
            })
            .Build();

        return new OpenWeatherMapForecastClient(new FabricaFalsa(handler), config);
    }

    [Fact]
    public async Task ObterPrevisaoAsync_MontaQueryComUnitsLangECoordenadaInvariante()
    {
        var handler = new HandlerFalso(HttpStatusCode.OK, JsonExemplo);
        var cliente = ClienteCom(handler);

        // Cultura de vírgula decimal FORÇADA, e não herdada da máquina: sem isto o teste
        // passaria num agente en-US mesmo que o cliente perdesse o InvariantCulture, ou
        // seja, passaria pelo motivo errado. A máquina do projeto é pt-BR, então é
        // exatamente esta cultura que quebraria a query string em produção.
        var culturaAnterior = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = new CultureInfo("pt-BR");
        try
        {
            await cliente.ObterPrevisaoAsync(-23.55, -46.63);
        }
        finally
        {
            CultureInfo.CurrentCulture = culturaAnterior;
        }

        var uri = handler.UriPedida!.ToString();

        // Ponto e não vírgula: "lat=-23,55" corrompe a query string.
        uri.Should().Contain("lat=-23.55");
        uri.Should().Contain("lon=-46.63");
        // Sem units=metric a temperatura chega em Kelvin e o app mostra 292 graus.
        uri.Should().Contain("units=metric");
        // Sem lang=pt_br a descrição da condição volta em inglês, e ela é lida em voz alta.
        uri.Should().Contain("lang=pt_br");
        uri.Should().Contain("appid=chave-de-teste");
    }

    [Fact]
    public async Task ObterPrevisaoAsync_RespostaNaoSucesso_LancaWeatherApiException()
    {
        // Corpo VÁLIDO de propósito, igual ao que a OpenWeatherMap devolve num 401: sem a
        // linha `if (!response.IsSuccessStatusCode)` o ParseForecast engoliria este JSON
        // (não tem "list", então devolve lista vazia) e o método voltaria sem erro nenhum.
        // Um corpo lixo faria o teste passar de graça, por JsonException.
        var handler = new HandlerFalso(
            HttpStatusCode.Unauthorized, """{ "cod": 401, "message": "Invalid API key." }""");
        var cliente = ClienteCom(handler);

        var acao = () => cliente.ObterPrevisaoAsync(-23.55, -46.63);

        (await acao.Should().ThrowAsync<WeatherApiException>())
            .Which.StatusCode.Should().Be(401);
    }
}
