using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface ISubprefeituraRepository : IRepository<Subprefeitura>
{
    Task<IEnumerable<Subprefeitura>> ObterAtivasAsync();
    Task<Subprefeitura?> ObterComUltimaLeituraAsync(Guid id);

    /// <summary>Subprefeitura com a região carregada (necessário para resolver o fuso).</summary>
    Task<Subprefeitura?> ObterComRegiaoAsync(Guid id);

    /// <summary>Ativas com a região (legenda de zona), o último score e a última leitura.</summary>
    Task<IReadOnlyList<Subprefeitura>> ObterAtivasComResumoAsync();
}
