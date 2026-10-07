using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface ISugestaoRepository : IRepository<Sugestao>
{
    /// <summary>Catálogo público: só ativas, por categoria, faixa e ordem.</summary>
    Task<IReadOnlyList<Sugestao>> ListarAtivasAsync();

    /// <summary>Lista todas as sugestões, incluindo inativas (uso administrativo).</summary>
    Task<IEnumerable<Sugestao>> ListarTodasAsync();
}
