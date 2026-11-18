namespace Pulsar.API.Domain.Alertas;

/// <summary>Uma área do Pulsar para casar com alertas: o código IBGE do município dela e os centros dos trechos.</summary>
public record AreaParaCasar(Guid Id, string? Ibge, IReadOnlyList<(double Lat, double Lon)> Centros);

/// <summary>
/// Quais áreas um alerta oficial atinge. Pelo código IBGE quando o alerta traz um (o da capital
/// vale as áreas todas dela); pelo polígono quando o centro de algum trecho da área cai dentro.
/// </summary>
public static class CasamentoAlerta
{
    public static IReadOnlyList<Guid> Areas(AlertaCap alerta, IReadOnlyList<AreaParaCasar> areas)
    {
        var codigos = alerta.CodigosIbge.ToHashSet();
        // Caixa de cada polígono calculada uma vez: o feed cobre o Brasil todo (~880 mil vértices),
        // e um centro fora da caixa não precisa do raio vértice por vértice.
        var poligonos = alerta.Poligonos.Select(p => (Pontos: p, Caixa: Caixa(p))).ToList();
        return areas
            .Where(a => (a.Ibge is not null && codigos.Contains(a.Ibge))
                        || poligonos.Any(p => a.Centros.Any(c => p.Caixa.Contem(c) && Dentro(c, p.Pontos))))
            .Select(a => a.Id)
            .Distinct()
            .ToList();
    }

    private readonly record struct CaixaLatLon(double LatMin, double LatMax, double LonMin, double LonMax)
    {
        public bool Contem((double Lat, double Lon) c) => c.Lat >= LatMin && c.Lat <= LatMax && c.Lon >= LonMin && c.Lon <= LonMax;
    }

    private static CaixaLatLon Caixa(IReadOnlyList<(double Lat, double Lon)> p)
    {
        double latMin = double.MaxValue, latMax = double.MinValue, lonMin = double.MaxValue, lonMax = double.MinValue;
        foreach (var (lat, lon) in p)
        {
            latMin = Math.Min(latMin, lat); latMax = Math.Max(latMax, lat);
            lonMin = Math.Min(lonMin, lon); lonMax = Math.Max(lonMax, lon);
        }
        return new(latMin, latMax, lonMin, lonMax);
    }

    /// <summary>Ponto no polígono por cruzamento de raio. Polígono em (lat, lon), fechado ou não.</summary>
    public static bool Dentro((double Lat, double Lon) ponto, IReadOnlyList<(double Lat, double Lon)> poligono)
    {
        var dentro = false;
        for (int i = 0, j = poligono.Count - 1; i < poligono.Count; j = i++)
        {
            var (yi, xi) = poligono[i];
            var (yj, xj) = poligono[j];
            if ((yi > ponto.Lat) != (yj > ponto.Lat)
                && ponto.Lon < (xj - xi) * (ponto.Lat - yi) / (yj - yi) + xi)
                dentro = !dentro;
        }
        return dentro;
    }
}
