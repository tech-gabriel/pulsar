namespace Pulsar.API.Services.Interfaces;

public interface IClimateService
{
    Task ColetarDadosAsync(Guid subprefeituraId, CancellationToken ct = default);
    Task ColetarTodasAsync(CancellationToken ct = default);
}
