using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Services.Interfaces;

public interface IScoreService
{
    Task<ScorePerigo> CalcularEPersistirAsync(Guid subprefeituraId, CancellationToken ct = default);
}
