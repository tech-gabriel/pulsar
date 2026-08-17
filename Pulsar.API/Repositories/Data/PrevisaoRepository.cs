using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class PrevisaoRepository : IPrevisaoRepository
{
    private readonly PulsarDbContext _context;

    public PrevisaoRepository(PulsarDbContext context) => _context = context;

    public async Task<DateTime?> ObterUltimaColetaAsync(Guid subprefeituraId)
    {
        var linhas = _context.PrevisoesClimaticas.Where(p => p.SubprefeituraId == subprefeituraId);
        if (!await linhas.AnyAsync()) return null;
        return await linhas.MaxAsync(p => p.ColetadoEm);
    }

    public async Task UpsertLoteAsync(
        Guid subprefeituraId, IReadOnlyList<PontoPrevisaoDto> pontos, DateTime coletadoEmUtc)
    {
        if (pontos.Count == 0) return;

        var instantes = pontos.Select(p => p.InstantePrevisto).ToList();
        var existentes = await _context.PrevisoesClimaticas
            .Where(p => p.SubprefeituraId == subprefeituraId && instantes.Contains(p.InstantePrevisto))
            .ToDictionaryAsync(p => p.InstantePrevisto);

        foreach (var ponto in pontos)
        {
            if (existentes.TryGetValue(ponto.InstantePrevisto, out var linha))
            {
                // Sobrescreve por completo: a previsão nova é sempre a mais confiável
                // para a mesma faixa. Somar aqui não faria sentido nenhum.
                linha.ChuvaMm = ponto.ChuvaMm;
                linha.ProbabilidadeChuva = ponto.ProbabilidadeChuva;
                linha.VentoKmH = ponto.VentoKmH;
                linha.RajadaKmH = ponto.RajadaKmH;
                linha.TemperaturaC = ponto.TemperaturaC;
                linha.CondicaoCodigo = ponto.CondicaoCodigo;
                linha.CondicaoDescricao = ponto.CondicaoDescricao;
                linha.ColetadoEm = coletadoEmUtc;
            }
            else
            {
                await _context.PrevisoesClimaticas.AddAsync(new PrevisaoClimatica
                {
                    SubprefeituraId = subprefeituraId,
                    InstantePrevisto = ponto.InstantePrevisto,
                    ChuvaMm = ponto.ChuvaMm,
                    ProbabilidadeChuva = ponto.ProbabilidadeChuva,
                    VentoKmH = ponto.VentoKmH,
                    RajadaKmH = ponto.RajadaKmH,
                    TemperaturaC = ponto.TemperaturaC,
                    CondicaoCodigo = ponto.CondicaoCodigo,
                    CondicaoDescricao = ponto.CondicaoDescricao,
                    ColetadoEm = coletadoEmUtc,
                });
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task<int> RemoverAntigasAsync(Guid subprefeituraId, DateTime limiteUtc)
    {
        var antigas = await _context.PrevisoesClimaticas
            .Where(p => p.SubprefeituraId == subprefeituraId && p.InstantePrevisto < limiteUtc)
            .ToListAsync();

        if (antigas.Count == 0) return 0;

        _context.PrevisoesClimaticas.RemoveRange(antigas);
        await _context.SaveChangesAsync();
        return antigas.Count;
    }

    public async Task<IReadOnlyList<PrevisaoClimatica>> ObterFuturasPorRegiaoAsync(
        Guid regiaoId, DateTime desdeUtc)
        => await _context.PrevisoesClimaticas
            .Where(p => p.Subprefeitura.RegiaoId == regiaoId && p.InstantePrevisto >= desdeUtc)
            .OrderBy(p => p.InstantePrevisto)
            .ToListAsync();
}
