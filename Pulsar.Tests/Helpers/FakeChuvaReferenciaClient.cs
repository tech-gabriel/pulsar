using Pulsar.API.External.Interfaces;

namespace Pulsar.Tests.Helpers;

/// <summary>Open-Meteo falso: série vazia por ponto (padrão) ou falha, sem rede.</summary>
public class FakeChuvaReferenciaClient : IChuvaReferenciaClient
{
    public bool Falhar { get; set; }

    public Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>> ObterHorariaAsync(
        IReadOnlyList<(double Lat, double Lon)> pontos, CancellationToken ct = default)
        => Vazia(pontos);

    public Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>> ObterHorariaPassadaAsync(
        IReadOnlyList<(double Lat, double Lon)> pontos, int dias, CancellationToken ct = default)
        => Vazia(pontos);

    private Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>> Vazia(IReadOnlyList<(double Lat, double Lon)> pontos)
    {
        if (Falhar) throw new HttpRequestException("Open-Meteo fora do ar (fake).");
        return Task.FromResult<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>>(
            [.. pontos.Select(_ => (IReadOnlyDictionary<DateTime, double>)new Dictionary<DateTime, double>())]);
    }
}
