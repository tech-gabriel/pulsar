using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Coleta e serve a previsão. Roda dentro do ciclo de 15 min, mas só chama a API uma
/// vez por hora por subprefeitura: previsão não muda a cada 15 min, e o orçamento de
/// chamadas do plano grátis não é para ser gasto à toa.
/// </summary>
public class PrevisaoService : IPrevisaoService
{
    // 55 e não 60 de propósito: o ciclo é de 15 min, então com 60 a coleta escorregaria
    // para 75 min de fato, porque no ciclo em que a idade bate 60 ela ainda não é MAIOR
    // que 60. Com 55 sai exatamente uma coleta por hora de relógio.
    private const int IdadeMinimaColetaMinutos = 55;

    // Mantém a faixa corrente visível: a faixa das 15h ainda importa às 17h.
    private const int RetencaoHoras = 3;

    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly IPrevisaoRepository _previsaoRepo;
    private readonly IForecastClient _forecast;
    private readonly ILogger<PrevisaoService> _logger;

    public PrevisaoService(
        ISubprefeituraRepository subprefeituraRepo,
        IPrevisaoRepository previsaoRepo,
        IForecastClient forecast,
        ILogger<PrevisaoService> logger)
    {
        _subprefeituraRepo = subprefeituraRepo;
        _previsaoRepo = previsaoRepo;
        _forecast = forecast;
        _logger = logger;
    }

    public async Task<bool> AtualizarAsync(Guid subprefeituraId, CancellationToken ct = default)
    {
        // Kind.Utc do UtcNow acompanha o valor até o banco. O Npgsql recusa Local ou
        // Unspecified em timestamptz, então nada aqui pode passar por hora local.
        var agora = DateTime.UtcNow;

        var ultimaColeta = await _previsaoRepo.ObterUltimaColetaAsync(subprefeituraId);
        if (ultimaColeta is { } quando
            && (agora - quando).TotalMinutes < IdadeMinimaColetaMinutos)
        {
            return false;
        }

        var sub = await _subprefeituraRepo.ObterPorIdAsync(subprefeituraId)
            ?? throw new InvalidOperationException($"Subprefeitura {subprefeituraId} não encontrada.");

        var pontos = await _forecast.ObterPrevisaoAsync(sub.Latitude, sub.Longitude, ct);
        if (pontos.Count == 0)
        {
            _logger.LogWarning("Previsão vazia para {Nome}. Nada persistido.", sub.Nome);
            return true;
        }

        await _previsaoRepo.UpsertLoteAsync(subprefeituraId, pontos, agora);
        await _previsaoRepo.RemoverAntigasAsync(subprefeituraId, agora.AddHours(-RetencaoHoras));

        _logger.LogDebug("Previsão atualizada para {Nome}: {Total} faixas.", sub.Nome, pontos.Count);
        return true;
    }

    public async Task<IReadOnlyList<FaixaPrevisaoDto>> ObterFaixasRegiaoAsync(
        Guid regiaoId, int maxFaixas, CancellationToken ct = default)
    {
        var linhas = await _previsaoRepo.ObterFuturasPorRegiaoAsync(regiaoId, DateTime.UtcNow);
        if (linhas.Count == 0) return [];

        return linhas
            .GroupBy(p => p.InstantePrevisto)
            .OrderBy(g => g.Key)
            .Take(maxFaixas)
            .Select(g =>
            {
                // Pior caso, e a condição textual vem da sub de pior chuva para o
                // rótulo casar com o número exibido ao lado dele.
                var pior = g.OrderByDescending(p => p.ChuvaMm).First();
                return new FaixaPrevisaoDto
                {
                    InstantePrevisto = g.Key,
                    ChuvaMm = g.Max(p => p.ChuvaMm),
                    ProbabilidadeChuva = g.Max(p => p.ProbabilidadeChuva),
                    VentoKmH = g.Max(p => p.VentoKmH),
                    RajadaKmH = g.Max(p => p.RajadaKmH),
                    TemperaturaC = g.Max(p => p.TemperaturaC),
                    CondicaoCodigo = pior.CondicaoCodigo,
                    CondicaoDescricao = pior.CondicaoDescricao,
                    ColetadoEm = g.Min(p => p.ColetadoEm),
                };
            })
            .ToList();
    }
}
