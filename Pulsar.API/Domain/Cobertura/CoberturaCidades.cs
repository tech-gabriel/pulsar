using System.Globalization;

namespace Pulsar.API.Domain.Cobertura;

/// <summary>Retângulo largo de uma cidade monitorada: barra coordenada trocada ou fora da cobertura.</summary>
public record CaixaCidade(string Cidade, double LatMin, double LatMax, double LonMin, double LonMax);

/// <summary>
/// Os limites de coordenada de cada cidade, antes fixos em São Paulo. São um filtro grosso (o
/// retângulo da Baixada encosta no da capital): quem decide a área é o polígono. Cada pessoa só
/// alcança as cidades que enxerga; a Baixada, escondida até o lançamento, entra só para o Admin.
/// </summary>
public static class CoberturaCidades
{
    public static readonly IReadOnlyList<CaixaCidade> Todas =
    [
        new("São Paulo", -24.01, -23.35, -46.83, -46.36),
        // Retângulo de pulsar-web/public/baixada-santista-leve.geojson arredondado para fora.
        new("Baixada Santista", -24.50, -23.64, -47.13, -45.79),
    ];

    public static IEnumerable<string> Nomes => Todas.Select(c => c.Cidade);

    /// <summary>Escrito como "dentro": NaN falha em toda comparação e cai em false.</summary>
    public static bool Dentro(double lat, double lon, IEnumerable<string> cidades)
        => Das(cidades).Any(c => lat >= c.LatMin && lat <= c.LatMax && lon >= c.LonMin && lon <= c.LonMax);

    /// <summary>"minLon,minLat,maxLon,maxLat" da união das cidades (formato do bbox do MapTiler).</summary>
    public static string Bbox(IEnumerable<string> cidades)
    {
        var caixas = Das(cidades).ToList();
        if (caixas.Count == 0) caixas = [Todas[0]];
        string F(double v) => v.ToString(CultureInfo.InvariantCulture);
        return $"{F(caixas.Min(c => c.LonMin))},{F(caixas.Min(c => c.LatMin))},{F(caixas.Max(c => c.LonMax))},{F(caixas.Max(c => c.LatMax))}";
    }

    private static IEnumerable<CaixaCidade> Das(IEnumerable<string> cidades)
    {
        var nomes = cidades.ToHashSet(StringComparer.Ordinal);
        return Todas.Where(c => nomes.Contains(c.Cidade));
    }
}
