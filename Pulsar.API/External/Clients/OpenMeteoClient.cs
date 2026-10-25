using System.Globalization;
using System.Text.Json;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

/// <summary>
/// Chuva horária do Open-Meteo, sem chave. Uma chamada por ciclo leva todas as
/// subprefeituras (a API aceita várias coordenadas separadas por vírgula).
/// </summary>
/// <remarks>
/// O plano grátis do Open-Meteo é para uso não comercial. Antes de cobrar pelo Pulsar,
/// trocar pelo plano pago ou por outra fonte.
/// </remarks>
public class OpenMeteoClient : IChuvaReferenciaClient
{
    private readonly IHttpClientFactory _httpClientFactory;

    public OpenMeteoClient(IHttpClientFactory httpClientFactory) => _httpClientFactory = httpClientFactory;

    public async Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>> ObterHorariaAsync(
        IReadOnlyList<(double Lat, double Lon)> pontos, CancellationToken ct = default)
    {
        if (pontos.Count == 0) return [];

        var lat = string.Join(',', pontos.Select(p => p.Lat.ToString(CultureInfo.InvariantCulture)));
        var lon = string.Join(',', pontos.Select(p => p.Lon.ToString(CultureInfo.InvariantCulture)));
        var client = _httpClientFactory.CreateClient("openmeteo");

        var response = await client.GetAsync(
            $"forecast?latitude={lat}&longitude={lon}&hourly=precipitation&past_hours=10&forecast_hours=4&timezone=GMT", ct);
        if (!response.IsSuccessStatusCode)
            throw new WeatherApiException($"Falha ao obter chuva do Open-Meteo: {response.StatusCode}", (int)response.StatusCode);

        return Parse(await response.Content.ReadAsStringAsync(ct));
    }

    /// <summary>Público e estático para ser testável sem HttpClient, como o ParseForecast.</summary>
    public static IReadOnlyList<IReadOnlyDictionary<DateTime, double>> Parse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        // Uma coordenada volta como objeto; várias, como lista.
        var locais = doc.RootElement.ValueKind == JsonValueKind.Array
            ? doc.RootElement.EnumerateArray().ToList()
            : [doc.RootElement];

        return locais.Select(local =>
        {
            var hourly = local.GetProperty("hourly");
            var horas = hourly.GetProperty("time").EnumerateArray().ToList();
            var chuva = hourly.GetProperty("precipitation").EnumerateArray().ToList();
            var serie = new Dictionary<DateTime, double>();
            for (var i = 0; i < horas.Count; i++)
            {
                var hora = DateTime.SpecifyKind(
                    DateTime.ParseExact(horas[i].GetString()!, "yyyy-MM-dd'T'HH:mm", CultureInfo.InvariantCulture),
                    DateTimeKind.Utc);
                serie[hora] = chuva[i].ValueKind == JsonValueKind.Number ? chuva[i].GetDouble() : 0.0;
            }
            return (IReadOnlyDictionary<DateTime, double>)serie;
        }).ToList();
    }
}
