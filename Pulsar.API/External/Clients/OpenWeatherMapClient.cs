using System.Text.Json;
using System.Text.Json.Serialization;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

public class WeatherApiException : Exception
{
    public int? StatusCode { get; }

    public WeatherApiException(string message, int? statusCode = null) : base(message)
        => StatusCode = statusCode;
}

internal sealed class WeatherResponse
{
    [JsonPropertyName("wind")]
    public WindData? Wind { get; set; }

    [JsonPropertyName("visibility")]
    public int Visibility { get; set; }

    [JsonPropertyName("rain")]
    public RainData? Rain { get; set; }

    [JsonPropertyName("dt")]
    public long Dt { get; set; }
}

internal sealed class WindData
{
    [JsonPropertyName("speed")]
    public double Speed { get; set; }
}

internal sealed class RainData
{
    [JsonPropertyName("1h")]
    public double OneHour { get; set; }
}

internal sealed class UviResponse
{
    [JsonPropertyName("value")]
    public double Value { get; set; }
}

public class OpenWeatherMapClient : IWeatherClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenWeatherMapClient> _logger;
    private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public OpenWeatherMapClient(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<OpenWeatherMapClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<DadosClimaticosDto> ObterDadosAsync(double latitude, double longitude, CancellationToken ct = default)
    {
        var apiKey = _configuration["OpenWeatherMap:ApiKey"]
            ?? throw new InvalidOperationException("OpenWeatherMap:ApiKey não configurada.");

        var client = _httpClientFactory.CreateClient("openweathermap");

        var weatherTask = ObterWeatherAsync(client, latitude, longitude, apiKey, ct);
        var uviTask = ObterUviAsync(client, latitude, longitude, apiKey, ct);

        await Task.WhenAll(weatherTask, uviTask);

        var weather = await weatherTask;
        var uvi = await uviTask;

        return new DadosClimaticosDto
        {
            ChuvaMmH = weather.Rain?.OneHour ?? 0.0,
            VentoKmH = (weather.Wind?.Speed ?? 0.0) * 3.6,
            VisibilidadeKm = weather.Visibility / 1000.0,
            IndiceUv = uvi,
            Timestamp = DateTimeOffset.FromUnixTimeSeconds(weather.Dt).UtcDateTime
        };
    }

    private async Task<WeatherResponse> ObterWeatherAsync(
        HttpClient client, double lat, double lon, string apiKey, CancellationToken ct)
    {
        var url = $"weather?lat={lat.ToString(System.Globalization.CultureInfo.InvariantCulture)}&lon={lon.ToString(System.Globalization.CultureInfo.InvariantCulture)}&appid={apiKey}&units=metric";

        var response = await client.GetAsync(url, ct);
        if (!response.IsSuccessStatusCode)
            throw new WeatherApiException($"Falha ao obter dados climáticos: {response.StatusCode}", (int)response.StatusCode);

        var content = await response.Content.ReadAsStringAsync(ct);
        return JsonSerializer.Deserialize<WeatherResponse>(content, _jsonOptions)
            ?? throw new WeatherApiException("Resposta inválida da API /weather.");
    }

    private async Task<double> ObterUviAsync(
        HttpClient client, double lat, double lon, string apiKey, CancellationToken ct)
    {
        try
        {
            var url = $"uvi?lat={lat.ToString(System.Globalization.CultureInfo.InvariantCulture)}&lon={lon.ToString(System.Globalization.CultureInfo.InvariantCulture)}&appid={apiKey}";
            var response = await client.GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Falha ao obter índice UV ({StatusCode}). Usando 0.", response.StatusCode);
                return 0.0;
            }

            var content = await response.Content.ReadAsStringAsync(ct);
            var uvi = JsonSerializer.Deserialize<UviResponse>(content, _jsonOptions);
            return uvi?.Value ?? 0.0;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Erro ao obter índice UV. Usando 0.");
            return 0.0;
        }
    }
}
