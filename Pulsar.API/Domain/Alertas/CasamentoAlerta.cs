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
        return areas
            .Where(a => (a.Ibge is not null && codigos.Contains(a.Ibge))
                        || alerta.Poligonos.Any(p => a.Centros.Any(c => Dentro(c, p))))
            .Select(a => a.Id)
            .Distinct()
            .ToList();
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
