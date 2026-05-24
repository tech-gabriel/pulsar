using Pulsar.API.DTOs;

namespace Pulsar.API.External.Interfaces;

public interface IWeatherClient
{
    Task<DadosClimaticosDto> ObterDadosAsync(double latitude, double longitude, CancellationToken ct = default);
}
