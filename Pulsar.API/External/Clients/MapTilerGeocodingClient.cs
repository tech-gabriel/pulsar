using System.Text.Json;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

/// <summary>
/// Geocoding via MapTiler (https://docs.maptiler.com/cloud/api/geocoding/).
/// Resultados enviesados para o município de São Paulo (bbox + proximity, country=br).
/// Sem chave configurada (MapTiler:ApiKey), degrada para lista vazia sem quebrar.
/// </summary>
public class MapTilerGeocodingClient : IGeocodingClient
{
    // Bounding box do município de São Paulo: minLon,minLat,maxLon,maxLat (oeste,sul,leste,norte).
    private const string BboxSaoPaulo = "-46.826,-24.008,-46.365,-23.357";
    // Centro de SP em lon,lat — enviesa os resultados por proximidade.
    private const string ProximitySaoPaulo = "-46.6333,-23.5505";
    private const int LimiteResultados = 6;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MapTilerGeocodingClient> _logger;

    public MapTilerGeocodingClient(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<MapTilerGeocodingClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<IReadOnlyList<EnderecoGeocodificado>> BuscarAsync(string consulta, CancellationToken ct = default)
    {
        var apiKey = _configuration["MapTiler:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("MapTiler:ApiKey não configurada — busca de endereços desativada.");
            return [];
        }

        var client = _httpClientFactory.CreateClient("maptiler");
        var url =
            $"{Uri.EscapeDataString(consulta)}.json" +
            $"?key={apiKey}" +
            "&country=br&language=pt&autocomplete=true" +
            $"&limit={LimiteResultados}" +
            $"&bbox={BboxSaoPaulo}&proximity={ProximitySaoPaulo}";

        using var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(ct);
        return ParseFeatureCollection(json);
    }

    /// <summary>
    /// Faz o parse da FeatureCollection do MapTiler em resultados de endereço.
    /// Exposto como estático para ser testável sem chamadas HTTP.
    /// </summary>
    public static IReadOnlyList<EnderecoGeocodificado> ParseFeatureCollection(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!root.TryGetProperty("features", out var features) || features.ValueKind != JsonValueKind.Array)
            return [];

        var resultados = new List<EnderecoGeocodificado>();
        foreach (var feature in features.EnumerateArray())
        {
            var descricao = feature.TryGetProperty("place_name", out var pn) ? pn.GetString() : null;
            if (string.IsNullOrWhiteSpace(descricao))
                continue;

            // O MapTiler devolve o ponto em "center": [lon, lat].
            if (!feature.TryGetProperty("center", out var center)
                || center.ValueKind != JsonValueKind.Array
                || center.GetArrayLength() < 2)
                continue;

            var lon = center[0].GetDouble();
            var lat = center[1].GetDouble();
            resultados.Add(new EnderecoGeocodificado(descricao!, lat, lon));
        }

        return resultados;
    }
}
