using System.Text.Json;
using NetTopologySuite.Geometries;

namespace Pulsar.Calibracao;

/// <summary>Polígono do SGB num dos 9 municípios. Classe: "Alta", "Média", "Enxurrada" ou "Setor".</summary>
public record PoligonoSgb(string Municipio, string Classe, Geometry Forma);

/// <summary>
/// "Costuma alagar" da Baixada, do Serviço Geológico do Brasil (ArcGIS REST público do GeoPortal,
/// consultado em 17/11/2026): carta de suscetibilidade a inundação (Alta e Média), suscetibilidade
/// a enxurrada (sem níveis) e setores de risco de inundação e enxurrada da setorização.
/// </summary>
public static class FonteSgb
{
    private const string Servico = "https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial";
    private const string Envelope = "-47.2,-24.45,-45.95,-23.7";
    public const int TamanhoPagina = 1000;

    private static readonly (string Cache, string Camada, string Onde, string Campos, string? ClasseFixa)[] Consultas =
    [
        ("sgb-inundacao.geojson", "inundacao", "classe IN ('Alta','Média')", "municipio,classe", null),
        ("sgb-enxurrada.geojson", "enxurrada", "1=1", "municipio", "Enxurrada"),
        ("sgb-risco.geojson", "risco", "tipolo_g1 IN ('Inundação','Enxurrada')", "municipio", "Setor"),
    ];

    public static async Task<List<PoligonoSgb>> PoligonosAsync(HttpClient http, string dirCache)
    {
        Directory.CreateDirectory(dirCache);
        var todos = new List<PoligonoSgb>();
        foreach (var q in Consultas)
        {
            var arquivo = Path.Combine(dirCache, q.Cache);
            if (!File.Exists(arquivo))
            {
                var features = new List<string>();
                for (var offset = 0; ; offset += TamanhoPagina)
                {
                    var url = $"{Servico}/{q.Camada}/FeatureServer/0/query?where={Uri.EscapeDataString(q.Onde)}"
                        + $"&geometry={Envelope}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects"
                        + $"&outFields={q.Campos}&outSR=4326&f=geojson&resultOffset={offset}&resultRecordCount={TamanhoPagina}";
                    using var doc = JsonDocument.Parse(await http.GetStringAsync(url));
                    var pagina = doc.RootElement.GetProperty("features").EnumerateArray().Select(f => f.GetRawText()).ToList();
                    features.AddRange(pagina);
                    if (!Continua(doc.RootElement) || pagina.Count == 0) break;
                }
                await File.WriteAllTextAsync(arquivo, "{\"type\":\"FeatureCollection\",\"features\":[" + string.Join(",", features) + "]}");
            }
            todos.AddRange(Ler(await File.ReadAllTextAsync(arquivo), q.ClasseFixa));
        }
        return todos;
    }

    private static bool Continua(JsonElement raiz)
        => (raiz.TryGetProperty("exceededTransferLimit", out var e) && e.ValueKind == JsonValueKind.True)
           || (raiz.TryGetProperty("properties", out var p) && p.TryGetProperty("exceededTransferLimit", out var e2) && e2.ValueKind == JsonValueKind.True);

    /// <summary>Só os 9 municípios, com o nome da área ("ITANHAÉM (SP)" vira "Itanhaém"). Forma válida (Buffer(0)).</summary>
    public static List<PoligonoSgb> Ler(string geojson, string? classeFixa = null)
    {
        var porChave = Baixada.Todas.ToDictionary(b => GradeH3.Chave(b.Nome), b => b.Nome);
        var r = new List<PoligonoSgb>();
        using var doc = JsonDocument.Parse(geojson);
        foreach (var f in doc.RootElement.GetProperty("features").EnumerateArray())
        {
            var p = f.GetProperty("properties");
            var bruto = (p.GetProperty("municipio").GetString() ?? "").Split('(')[0];
            if (!porChave.TryGetValue(GradeH3.Chave(bruto), out var municipio)) continue;
            var classe = classeFixa ?? p.GetProperty("classe").GetString() ?? "";
            if (!f.TryGetProperty("geometry", out var geo) || geo.ValueKind != JsonValueKind.Object) continue;
            var coords = geo.GetProperty("coordinates");
            var aneis = geo.GetProperty("type").GetString() == "MultiPolygon" ? coords.EnumerateArray().ToList() : [coords];
            foreach (var a in aneis)
            {
                var poligono = GradeH3.Poligono(a);
                r.Add(new PoligonoSgb(municipio, classe, poligono.IsValid ? poligono : poligono.Buffer(0)));
            }
        }
        return r;
    }
}
