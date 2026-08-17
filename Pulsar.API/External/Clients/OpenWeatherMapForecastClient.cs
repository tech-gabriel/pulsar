using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

internal sealed class ForecastResponse
{
    [JsonPropertyName("list")]
    public List<ForecastItem>? List { get; set; }
}

internal sealed class ForecastItem
{
    [JsonPropertyName("dt")]
    public long Dt { get; set; }

    [JsonPropertyName("main")]
    public ForecastMain? Main { get; set; }

    [JsonPropertyName("weather")]
    public List<ForecastWeather>? Weather { get; set; }

    [JsonPropertyName("wind")]
    public ForecastWind? Wind { get; set; }

    [JsonPropertyName("pop")]
    public double Pop { get; set; }

    [JsonPropertyName("rain")]
    public ForecastRain? Rain { get; set; }
}

internal sealed class ForecastMain
{
    [JsonPropertyName("temp")]
    public double Temp { get; set; }
}

internal sealed class ForecastWeather
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

internal sealed class ForecastWind
{
    [JsonPropertyName("speed")]
    public double Speed { get; set; }

    // Nullable de propósito: a API omite gust em parte dos pontos.
    [JsonPropertyName("gust")]
    public double? Gust { get; set; }
}

internal sealed class ForecastRain
{
    // Volume da faixa de 3h. O objeto `rain` inteiro é omitido quando não chove.
    [JsonPropertyName("3h")]
    public double ThreeHours { get; set; }
}

/// <summary>
/// Previsão de 5 dias em passos de 3h (/data/2.5/forecast). É a única previsão do
/// plano grátis: previsão horária e minuto a minuto só existem no One Call API 3.0,
/// que é assinatura separada. Uma chamada devolve os 40 pontos dos 5 dias.
/// </summary>
public class OpenWeatherMapForecastClient : IForecastClient
{
    private const double MetrosPorSegundoParaKmH = 3.6;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public OpenWeatherMapForecastClient(
        IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task<IReadOnlyList<PontoPrevisaoDto>> ObterPrevisaoAsync(
        double latitude, double longitude, CancellationToken ct = default)
    {
        var apiKey = _configuration["OpenWeatherMap:ApiKey"]
            ?? throw new InvalidOperationException("OpenWeatherMap:ApiKey não configurada.");

        var client = _httpClientFactory.CreateClient("openweathermap");
        // InvariantCulture porque separador decimal com vírgula corromperia a query string.
        var lat = latitude.ToString(CultureInfo.InvariantCulture);
        var lon = longitude.ToString(CultureInfo.InvariantCulture);

        var response = await client.GetAsync(
            $"forecast?lat={lat}&lon={lon}&appid={apiKey}&units=metric", ct);

        if (!response.IsSuccessStatusCode)
            throw new WeatherApiException(
                $"Falha ao obter previsão: {response.StatusCode}", (int)response.StatusCode);

        var content = await response.Content.ReadAsStringAsync(ct);
        return ParseForecast(content);
    }

    /// <summary>Público e estático para ser testável sem HttpClient, como o CgespNoticiaClient.ParseRss.</summary>
    public static IReadOnlyList<PontoPrevisaoDto> ParseForecast(string json)
    {
        var resposta = JsonSerializer.Deserialize<ForecastResponse>(json, JsonOpts)
            ?? throw new WeatherApiException("Resposta inválida da API /forecast.");

        if (resposta.List is null) return [];

        return resposta.List.Select(item =>
        {
            var condicao = item.Weather?.FirstOrDefault();
            return new PontoPrevisaoDto
            {
                // UtcDateTime garante Kind.Utc, exigido pelo Npgsql para gravar em timestamptz.
                InstantePrevisto = DateTimeOffset.FromUnixTimeSeconds(item.Dt).UtcDateTime,
                ChuvaMm = item.Rain?.ThreeHours ?? 0.0,
                ProbabilidadeChuva = item.Pop,
                VentoKmH = (item.Wind?.Speed ?? 0.0) * MetrosPorSegundoParaKmH,
                RajadaKmH = item.Wind?.Gust is { } gust ? gust * MetrosPorSegundoParaKmH : null,
                TemperaturaC = item.Main?.Temp ?? 0.0,
                CondicaoCodigo = condicao?.Id ?? 0,
                CondicaoDescricao = condicao?.Description ?? string.Empty,
            };
        }).ToList();
    }
}
