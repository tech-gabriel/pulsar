using Pulsar.API.External.Interfaces;

namespace Pulsar.Tests.Helpers;

/// <summary>Open-Meteo falso: série vazia por ponto (padrão) ou falha, sem rede.</summary>
public class FakeChuvaReferenciaClient : IChuvaReferenciaClient
{
    public bool Falhar { get; set; }
    public bool FalharComTimeout { get; set; }
    public int Chamadas { get; private set; }

    /// <summary>Espera antes de responder (respeita o cancelamento), para simular um Open-Meteo lento.</summary>
    public TimeSpan? Atraso { get; set; }

    /// <summary>Quando definida, é a série devolvida para todos os pontos (chaves em hora cheia UTC).</summary>
    public IReadOnlyDictionary<DateTime, double>? SerieParaTodos { get; set; }

    public Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>> ObterHorariaAsync(
        IReadOnlyList<(double Lat, double Lon)> pontos, CancellationToken ct = default)
        => Vazia(pontos, ct);

    public Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>> ObterHorariaPassadaAsync(
        IReadOnlyList<(double Lat, double Lon)> pontos, int dias, CancellationToken ct = default)
        => Vazia(pontos, ct);

    private async Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>> Vazia(IReadOnlyList<(double Lat, double Lon)> pontos, CancellationToken ct)
    {
        Chamadas++;
        if (Atraso is { } atraso) await Task.Delay(atraso, ct);
        if (FalharComTimeout) throw new TaskCanceledException("Timeout do HttpClient (fake).");
        if (Falhar) throw new HttpRequestException("Open-Meteo fora do ar (fake).");
        return [.. pontos.Select(_ => SerieParaTodos ?? new Dictionary<DateTime, double>())];
    }
}
