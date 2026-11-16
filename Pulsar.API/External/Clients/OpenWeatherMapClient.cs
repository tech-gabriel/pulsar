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

    [JsonPropertyName("main")]
    public MainData? Main { get; set; }

    [JsonPropertyName("dt")]
    public long Dt { get; set; }
}

internal sealed class WindData
{
    [JsonPropertyName("speed")]
    public double Speed { get; set; }
}

internal sealed class MainData
{
    [JsonPropertyName("temp")]
    public double Temp { get; set; }

    [JsonPropertyName("feels_like")]
    public double FeelsLike { get; set; }

    [JsonPropertyName("humidity")]
    public double Humidity { get; set; }
}

internal sealed class RainData
{
    [JsonPropertyName("1h")]
    public double OneHour { get; set; }
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
        var uviTask = ObterUviAsync(latitude, longitude, ct);

        await Task.WhenAll(weatherTask, uviTask);

        var weather = await weatherTask;
        var uvi = await uviTask;

        return new DadosClimaticosDto
        {
            ChuvaMmH = weather.Rain?.OneHour ?? 0.0,
            VentoKmH = (weather.Wind?.Speed ?? 0.0) * 3.6,
            VisibilidadeKm = weather.Visibility / 1000.0,
            IndiceUv = uvi,
            TemperaturaC = weather.Main?.Temp ?? 0.0,
            SensacaoTermica = weather.Main?.FeelsLike ?? 0.0,
            Umidade = weather.Main?.Humidity ?? 0.0,
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

    /// <summary>
    /// UV de agora pelo Open-Meteo. O /uvi da OpenWeatherMap devolve o pico do dia, e a tela
    /// mostrava "UV 13 extremo" às 20h (crítica de 15/11). À noite o Open-Meteo dá zero.
    /// </summary>
    private async Task<double> ObterUviAsync(double lat, double lon, CancellationToken ct)
    {
        try
        {
            var inv = System.Globalization.CultureInfo.InvariantCulture;
            var url = $"forecast?latitude={lat.ToString(inv)}&longitude={lon.ToString(inv)}&current=uv_index";
            var response = await _httpClientFactory.CreateClient("openmeteo").GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Falha ao obter índice UV ({StatusCode}). Usando 0.", response.StatusCode);
                return 0.0;
            }

            return UvAtual(await response.Content.ReadAsStringAsync(ct));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Erro ao obter índice UV. Usando 0.");
            return 0.0;
        }
    }

    /// <summary>O <c>current.uv_index</c> do Open-Meteo; sem o campo (ou nulo), zero.</summary>
    public static double UvAtual(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("current", out var atual)
            && atual.TryGetProperty("uv_index", out var uv) && uv.ValueKind == JsonValueKind.Number
            ? Math.Max(0, uv.GetDouble()) : 0.0;
    }
}
