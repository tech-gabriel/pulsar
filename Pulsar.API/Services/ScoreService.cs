using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Score;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class ScoreService : IScoreService
{
    // 48h e não 72h: a retenção das leituras é 72h, e a janela cheia na borda pegaria
    // um dia parcialmente apagado.
    public const int JanelaHoras = 48;

    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly ILeituraRepository _leituraRepo;
    private readonly IScoreRepository _scoreRepo;
    private readonly IRiscoCelulasService _riscoCelulas;
    private readonly ILogger<ScoreService> _logger;

    public ScoreService(
        ISubprefeituraRepository subprefeituraRepo,
        ILeituraRepository leituraRepo,
        IScoreRepository scoreRepo,
        IRiscoCelulasService riscoCelulas,
        ILogger<ScoreService> logger)
    {
        _subprefeituraRepo = subprefeituraRepo;
        _leituraRepo = leituraRepo;
        _scoreRepo = scoreRepo;
        _riscoCelulas = riscoCelulas;
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
        var daArea = CalculadoraScore.Calcular(entrada);
        var pelosTrechos = await AlagamentoDosTrechosAsync(entrada, ct);
        score.Aplicar(pelosTrechos is null ? daArea : daArea.ComAlagamento(pelosTrechos.Alagamento));
        score.Chuva3hMedidaMm = pelosTrechos?.Chuva3hMedidaMm is { } mm ? Math.Round(mm, 1) : null;

        await _scoreRepo.AdicionarAsync(score);
        await _scoreRepo.SalvarAsync();

        _logger.LogDebug("Score {Nome}: {Valor:F1} ({Faixa}, {Perigo})",
            subprefeitura.Nome, score.Valor, score.Faixa, score.PerigoPrincipal);

        return score;
    }

    /// <summary>
    /// O alagamento da área é o meio-termo dos trechos dela (chuva medida onde há estação
    /// perto). Vento e calor seguem pela área. Sem grade para a área, ou se a conta por
    /// trecho falhar, vale a conta pela área inteira: o ciclo não pode ficar sem score.
    /// </summary>
    private async Task<AlagamentoArea?> AlagamentoDosTrechosAsync(EntradaScore entrada, CancellationToken ct)
    {
        try
        {
            return await _riscoCelulas.AlagamentoDaAreaAsync(entrada.Subprefeitura, entrada, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Falha na conta por trecho de {Nome}; o alagamento segue pela área inteira.", entrada.Subprefeitura);
            return null;
        }
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
