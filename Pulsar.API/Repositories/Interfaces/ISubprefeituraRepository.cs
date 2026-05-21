using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface ISubprefeituraRepository : IRepository<Subprefeitura>
{
    Task<IEnumerable<Subprefeitura>> ObterAtivasAsync();
    Task<Subprefeitura?> ObterComUltimaLeituraAsync(Guid id);
}
