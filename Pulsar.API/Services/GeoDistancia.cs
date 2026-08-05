namespace Pulsar.API.Services;

/// <summary>Cálculo de distância geodésica sem dependência de PostGIS.</summary>
public static class GeoDistancia
{
    private const double RaioTerraMetros = 6_371_000;

    /// <summary>Distância em metros entre dois pontos WGS84 (fórmula de haversine).</summary>
    public static double HaversineMetros(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = GrausParaRad(lat2 - lat1);
        var dLon = GrausParaRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(GrausParaRad(lat1)) * Math.Cos(GrausParaRad(lat2))
            * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return RaioTerraMetros * c;
    }

    private static double GrausParaRad(double graus) => graus * Math.PI / 180.0;
}
