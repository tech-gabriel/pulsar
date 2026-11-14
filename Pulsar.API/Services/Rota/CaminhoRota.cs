namespace Pulsar.API.Services.Rota;

/// <summary>
/// O caminho que o app desenha: a reta entre a origem e o destino (não o traçado da rua).
/// </summary>
public record CaminhoRota(double LatOrigem, double LonOrigem, double LatDestino, double LonDestino)
{
    /// <summary>Um hexágono da grade tem uns 900 m de lado a lado: 300 m não pula nenhum.</summary>
    private const double PassoMetros = 300;

    /// <summary>Teto de pontos. Num caminho absurdo o passo cresce, em vez de a conta crescer.</summary>
    private const int MaxPassos = 400;

    /// <summary>Pontos da reta, da origem ao destino, um a cada 300 m (ou mais, acima de 120 km).</summary>
    public IReadOnlyList<(double Lat, double Lon)> Pontos()
    {
        var metros = GeoDistancia.HaversineMetros(LatOrigem, LonOrigem, LatDestino, LonDestino);
        var passos = Math.Clamp((int)Math.Ceiling(metros / PassoMetros), 1, MaxPassos);
        return [.. Enumerable.Range(0, passos + 1).Select(i =>
        {
            var t = (double)i / passos;
            return (LatOrigem + (LatDestino - LatOrigem) * t, LonOrigem + (LonDestino - LonOrigem) * t);
        })];
    }
}
