using System.Text.Json;

namespace Pulsar.Calibracao;

public record OcorrenciaPonto(double Lat, double Lon, DateOnly Dia);

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
            var json = await JsonDaCamadaAsync(http, dirCache, camada);

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

    /// <summary>As mesmas ocorrências, com o ponto de cada uma. É o que a grade usa para o fator por célula.</summary>
    public static async Task<List<OcorrenciaPonto>> PontosAsync(HttpClient http, string dirCache)
    {
        var pontos = new List<OcorrenciaPonto>();
        foreach (var camada in Camadas)
            pontos.AddRange(Pontos(await JsonDaCamadaAsync(http, dirCache, camada)));
        return pontos;
    }

    /// <summary>Feição sem geometria ou sem data é pulada: não há onde ou quando contá-la.</summary>
    public static List<OcorrenciaPonto> Pontos(string json)
    {
        var pontos = new List<OcorrenciaPonto>();
        using var doc = JsonDocument.Parse(json);
        foreach (var f in doc.RootElement.GetProperty("features").EnumerateArray())
        {
            var geo = f.GetProperty("geometry");
            var data = f.GetProperty("properties").GetProperty("dt_ocorrencia").GetString() ?? "";
            if (geo.ValueKind != JsonValueKind.Object || data.Length < 10) continue;
            var xy = geo.GetProperty("coordinates");
            pontos.Add(new OcorrenciaPonto(xy[1].GetDouble(), xy[0].GetDouble(), DateOnly.ParseExact(data[..10], "yyyy-MM-dd")));
        }
        return pontos;
    }

    private static async Task<string> JsonDaCamadaAsync(HttpClient http, string dirCache, string camada)
    {
        var arq = Path.Combine(dirCache, $"geosampa-{camada.Split(':')[1]}.json");
        if (File.Exists(arq)) return await File.ReadAllTextAsync(arq);

        var json = await http.GetStringAsync($"{Wfs}?service=WFS&version=2.0.0&request=GetFeature"
            + $"&typeNames={camada}&outputFormat=application/json&srsName=urn:ogc:def:crs:EPSG::4326");
        Directory.CreateDirectory(dirCache);
        await File.WriteAllTextAsync(arq, json);
        return json;
    }
}
