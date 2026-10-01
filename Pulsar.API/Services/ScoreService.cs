using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Score;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class ScoreService : IScoreService
{
    // 48h e não 72h: a retenção das leituras é 72h, e a janela cheia na borda pegaria
    // um dia parcialmente apagado.
    private const int JanelaHoras = 48;

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

        var leituras = (await _leituraRepo.ObterHistoricoAsync(subprefeituraId, JanelaHoras)).ToList();
        if (leituras.All(l => l.Id != leitura.Id)) leituras.Add(leitura);

        var entrada = MontarEntrada(subprefeitura.Nome, leituras);
        var score = new ScorePerigo
        {
            SubprefeituraId = subprefeituraId,
            LeituraId = leitura.Id,
            Timestamp = leitura.Timestamp,
            Chuva3hMm = entrada.Chuva3hMm,
            Chuva48hMm = entrada.Chuva48hMm,
        };
        score.Aplicar(CalculadoraScore.Calcular(entrada));

        await _scoreRepo.AdicionarAsync(score);
        await _scoreRepo.SalvarAsync();

        _logger.LogDebug("Score {Nome}: {Valor:F1} ({Faixa}, {Perigo})",
            subprefeitura.Nome, score.Valor, score.Faixa, score.PerigoPrincipal);

        return score;
    }

    /// <summary>
    /// Acumulados contados a partir da ÚLTIMA leitura (não do relógio): leitura de 15 min,
    /// mm = ChuvaMmH × 0,25. Lacuna no coletor soma só o que existe; chuva negativa (dado
    /// ruim) conta como zero.
    /// </summary>
    public static EntradaScore MontarEntrada(string nomeSub, IReadOnlyList<LeituraClimatica> leituras)
    {
        var ultima = leituras.MaxBy(l => l.Timestamp)!;
        double Soma(int horas)
        {
            var limite = ultima.Timestamp.AddHours(-horas);
            return leituras.Where(l => l.Timestamp > limite).Sum(l => Math.Max(0, l.ChuvaMmH)) * 0.25;
        }
        return new EntradaScore(Soma(1), Soma(3), Soma(JanelaHoras), ultima.VentoKmH, ultima.SensacaoTermica, nomeSub);
    }
}
