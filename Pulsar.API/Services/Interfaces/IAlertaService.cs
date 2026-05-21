using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Services.Interfaces;

public interface IAlertaService
{
    Task<Alerta?> GerarAlertaAsync(Guid regiaoId, CancellationToken ct = default);
}
