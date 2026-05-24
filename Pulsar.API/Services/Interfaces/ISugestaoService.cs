using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Services.Interfaces;

public interface ISugestaoService
{
    Task<IEnumerable<Sugestao>> ObterSugestoesPorFaixaAsync(FaixaRisco faixa);
    Task<IEnumerable<Sugestao>> ObterSugestoesPorCategoriaEFaixaAsync(string categoria, FaixaRisco faixa);
}
