using System.Globalization;
using System.Text.Json;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

/// <summary>
/// Consome o WFS público do GeoSampa (GeoServer) para as camadas de ocorrências
/// de alagamento e inundação. Pede srsName=EPSG::4326 para receber WGS84 direto.
/// </summary>
public class GeoSampaClient : IGeoSampaClient
{
    private const string CamadaAlagamento = "geoportal:risco_ocorrencia_alagamento";
    private const string CamadaInundacao = "geoportal:risco_ocorrencia_inundacao";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GeoSampaClient> _logger;

    public GeoSampaClient(IHttpClientFactory httpClientFactory, ILogger<GeoSampaClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IReadOnlyList<OcorrenciaAlagamento>> ObterOcorrenciasAsync(CancellationToken ct = default)
    {
        var alag = await BuscarCamadaAsync(CamadaAlagamento, TipoOcorrenciaAlagamento.ALAGAMENTO, ct);
        var inund = await BuscarCamadaAsync(CamadaInundacao, TipoOcorrenciaAlagamento.INUNDACAO, ct);
        return [.. alag, .. inund];
    }

    private async Task<IReadOnlyList<OcorrenciaAlagamento>> BuscarCamadaAsync(
        string typeName, TipoOcorrenciaAlagamento tipo, CancellationToken ct)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("geosampa");
            var url = "wfs?service=WFS&version=2.0.0&request=GetFeature"
                + $"&typeNames={typeName}&outputFormat=application/json"
                + "&srsName=urn:ogc:def:crs:EPSG::4326";
            var json = await client.GetStringAsync(url, ct);
            return ParseOcorrencias(json, tipo);
        }
        catch (Exception ex)
        {
            // Degradação graciosa: falha de uma camada não aborta a outra.
            _logger.LogWarning(ex, "Falha ao buscar a camada {Camada} do GeoSampa.", typeName);
            return [];
        }
    }

    /// <summary>Parse do GeoJSON (WGS84) em ocorrências. Estático para ser testável sem HTTP.</summary>
    public static IReadOnlyList<OcorrenciaAlagamento> ParseOcorrencias(string geoJson, TipoOcorrenciaAlagamento tipo)
    {
        if (string.IsNullOrWhiteSpace(geoJson))
            return [];

        using var doc = JsonDocument.Parse(geoJson);
        if (!doc.RootElement.TryGetProperty("features", out var features)
            || features.ValueKind != JsonValueKind.Array)
            return [];

        var resultado = new List<OcorrenciaAlagamento>();
        foreach (var f in features.EnumerateArray())
        {
            if (!f.TryGetProperty("geometry", out var geom) || geom.ValueKind != JsonValueKind.Object)
                continue;
            if (!geom.TryGetProperty("coordinates", out var coords) || coords.ValueKind != JsonValueKind.Array
                || coords.GetArrayLength() < 2)
                continue;

            var props = f.GetProperty("properties");
            var cd = LerString(props, "cd_identificador");
            if (string.IsNullOrWhiteSpace(cd))
                continue;

            resultado.Add(new OcorrenciaAlagamento
            {
                CdIdentificador = cd,
                Tipo = tipo,
                // GeoJSON: coordinates = [longitude, latitude].
                Longitude = coords[0].GetDouble(),
                Latitude = coords[1].GetDouble(),
                DataOcorrencia = LerDataUtc(props, "dt_ocorrencia"),
                DataCarga = LerDataUtc(props, "dt_carga"),
                NmSubprefeitura = LerString(props, "nm_subprefeitura"),
                FonteOriginal = LerString(props, "sg_fonte_original") ?? string.Empty,
            });
        }
        return resultado;
    }

    private static string? LerString(JsonElement props, string nome)
        => props.TryGetProperty(nome, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static DateTime LerDataUtc(JsonElement props, string nome)
    {
        var raw = LerString(props, nome);
        if (string.IsNullOrWhiteSpace(raw))
            return DateTime.UnixEpoch;
        // Formato do GeoSampa: "2026-04-01Z".
        if (DateTimeOffset.TryParse(raw, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dto))
            return dto.UtcDateTime;
        return DateTime.UnixEpoch;
    }
}
