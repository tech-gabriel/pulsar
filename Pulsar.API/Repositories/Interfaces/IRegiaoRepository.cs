using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IRegiaoRepository : IRepository<Regiao>
{
    Task<IEnumerable<Regiao>> ObterTodasComSubprefeituraEScoreAsync();
    Task<Regiao?> ObterComDetalheAsync(Guid id);
}
