using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IScoreRepository : IRepository<ScorePerigo>
{
    Task<ScorePerigo?> ObterUltimoAsync(Guid subprefeituraId);
    Task<IEnumerable<ScorePerigo>> ObterHistoricoAsync(Guid subprefeituraId, int horas = 24);
}
