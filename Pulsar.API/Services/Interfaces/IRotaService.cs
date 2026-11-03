using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IRotaService
{
    /// <exception cref="ArgumentException">Ids repetidos ou que não são de subprefeituras ativas.</exception>
    Task<RotaAvaliacaoDto> AvaliarAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default);
}
