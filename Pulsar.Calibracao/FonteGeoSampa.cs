using System.Text.Json;

namespace Pulsar.Calibracao;

/// <summary>Ocorrências de alagamento e inundação da Defesa Civil (WFS público do GeoSampa).</summary>
public static class FonteGeoSampa
{
    private const string Wfs = "https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs";
    private static readonly string[] Camadas =
        ["geoportal:risco_ocorrencia_alagamento", "geoportal:risco_ocorrencia_inundacao"];

    /// <summary>Dias com ocorrência, por nome de subprefeitura. Sigla desconhecida lança.</summary>
    public static async Task<Dictionary<string, HashSet<DateOnly>>> DiasAsync(HttpClient http, string dirCache)
    {
        var porSigla = Subprefeituras.Todas.ToDictionary(s => s.Sigla, s => s.Nome);
        var dias = Subprefeituras.Todas.ToDictionary(s => s.Nome, _ => new HashSet<DateOnly>());

        foreach (var camada in Camadas)
        {
            var arq = Path.Combine(dirCache, $"geosampa-{camada.Split(':')[1]}.json");
            string json;
            if (File.Exists(arq)) json = await File.ReadAllTextAsync(arq);
            else
            {
                json = await http.GetStringAsync($"{Wfs}?service=WFS&version=2.0.0&request=GetFeature"
                    + $"&typeNames={camada}&outputFormat=application/json&srsName=urn:ogc:def:crs:EPSG::4326");
                Directory.CreateDirectory(dirCache);
                await File.WriteAllTextAsync(arq, json);
            }

            using var doc = JsonDocument.Parse(json);
            foreach (var f in doc.RootElement.GetProperty("features").EnumerateArray())
            {
                var p = f.GetProperty("properties");
                var nm = p.GetProperty("nm_subprefeitura").GetString() ?? "";
                var data = p.GetProperty("dt_ocorrencia").GetString() ?? "";
                if (data.Length < 10) continue;
                var sigla = nm.Split(" - ")[0].Trim().ToUpperInvariant();
                if (!porSigla.TryGetValue(sigla, out var nome))
                    throw new InvalidOperationException($"Sigla sem mapeamento no GeoSampa: '{nm}'");
                dias[nome].Add(DateOnly.ParseExact(data[..10], "yyyy-MM-dd"));
            }
        }
        return dias;
    }
}
