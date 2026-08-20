using Pulsar.API.DTOs;

namespace Pulsar.API.External.Interfaces;

/// <summary>
/// Fonte de previsão. Separada de IWeatherClient de propósito: condição atual e
/// previsão são conceitos distintos, e a separação é o que permite trocar por
/// One Call API 3.0 depois escrevendo uma implementação nova.
/// </summary>
public interface IForecastClient
{
    Task<IReadOnlyList<PontoPrevisaoDto>> ObterPrevisaoAsync(
        double latitude, double longitude, CancellationToken ct = default);
}
