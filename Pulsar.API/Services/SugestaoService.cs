using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class SugestaoService : ISugestaoService
{
    private readonly ISugestaoRepository _sugestaoRepo;

    public SugestaoService(ISugestaoRepository sugestaoRepo) => _sugestaoRepo = sugestaoRepo;

    public async Task<IEnumerable<Sugestao>> ObterSugestoesPorFaixaAsync(FaixaRisco faixa)
        => await _sugestaoRepo.ObterPorFaixaAsync(faixa);

    public async Task<IEnumerable<Sugestao>> ObterSugestoesPorCategoriaEFaixaAsync(string categoria, FaixaRisco faixa)
        => await _sugestaoRepo.ObterPorCategoriaEFaixaAsync(categoria, faixa);
}
