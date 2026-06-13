using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Repositories.Interfaces;

public interface ISugestaoRepository : IRepository<Sugestao>
{
    Task<IEnumerable<Sugestao>> ObterPorCategoriaEFaixaAsync(string categoria, FaixaRisco faixa);
    Task<IEnumerable<Sugestao>> ObterPorFaixaAsync(FaixaRisco faixa);

    /// <summary>Lista todas as sugestões, incluindo inativas (uso administrativo).</summary>
    Task<IEnumerable<Sugestao>> ListarTodasAsync();
}
