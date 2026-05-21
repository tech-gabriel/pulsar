using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class ScoreService : IScoreService
{
    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly ILeituraRepository _leituraRepo;
    private readonly IScoreRepository _scoreRepo;
    private readonly ILogger<ScoreService> _logger;

    public ScoreService(
        ISubprefeituraRepository subprefeituraRepo,
        ILeituraRepository leituraRepo,
        IScoreRepository scoreRepo,
        ILogger<ScoreService> logger)
    {
        _subprefeituraRepo = subprefeituraRepo;
        _leituraRepo = leituraRepo;
        _scoreRepo = scoreRepo;
        _logger = logger;
    }

    public async Task<ScorePerigo> CalcularEPersistirAsync(Guid subprefeituraId, CancellationToken ct = default)
    {
        var subprefeitura = await _subprefeituraRepo.ObterComUltimaLeituraAsync(subprefeituraId)
            ?? throw new InvalidOperationException($"Subprefeitura {subprefeituraId} não encontrada.");

        var leitura = subprefeitura.GetUltimaLeitura()
            ?? throw new InvalidOperationException($"Nenhuma leitura disponível para {subprefeitura.Nome}.");

        var score = new ScorePerigo
        {
            SubprefeituraId = subprefeituraId,
            LeituraId = leitura.Id,
            Timestamp = leitura.Timestamp
        };

        score.Valor = score.Calcular(leitura);
        score.Faixa = score.ClassificarFaixa();

        await _scoreRepo.AdicionarAsync(score);
        await _scoreRepo.SalvarAsync();

        _logger.LogDebug("Score calculado para {Nome}: {Valor:F1} ({Faixa})",
            subprefeitura.Nome, score.Valor, score.Faixa);

        return score;
    }
}
