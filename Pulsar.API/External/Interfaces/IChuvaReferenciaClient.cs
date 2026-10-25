namespace Pulsar.API.External.Interfaces;

/// <summary>
/// Segunda fonte de chuva, só para conferir a do OpenWeatherMap (ver PlausibilidadeChuva).
/// </summary>
public interface IChuvaReferenciaClient
{
    /// <summary>
    /// Chuva horária em mm por ponto, na ordem de <paramref name="pontos"/>, chaveada pela
    /// hora UTC. Cobre as últimas ~10 h e as próximas ~3 h.
    /// </summary>
    Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>> ObterHorariaAsync(
        IReadOnlyList<(double Lat, double Lon)> pontos, CancellationToken ct = default);
}
