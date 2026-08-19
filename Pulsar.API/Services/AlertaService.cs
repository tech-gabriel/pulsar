using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Gera e persiste o registro histórico de risco alto por região, com as sugestões
/// associadas. NÃO envia push: o disparo é responsabilidade única do MotorNotificacoes,
/// para existir um dono só do envio.
/// </summary>
/// <remarks>
/// Esta classe já notificou, deduplicando pela tabela Alerta. O motor deduplica pelo
/// livro-caixa NotificacaoEnviada, que é outra tabela: os dois caminhos não se enxergam,
/// então manter os dois ligados mandaria DOIS push por evento de risco alto. Quem quiser
/// voltar a notificar daqui não deve; o lugar de um aviso novo é um gatilho novo.
/// </remarks>
public class AlertaService : IAlertaService
{
    private readonly IScoreRepository _scoreRepo;
    private readonly ISugestaoRepository _sugestaoRepo;
    private readonly IAlertaRepository _alertaRepo;
    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly ILogger<AlertaService> _logger;

    public AlertaService(
        IScoreRepository scoreRepo,
        ISugestaoRepository sugestaoRepo,
        IAlertaRepository alertaRepo,
        ISubprefeituraRepository subprefeituraRepo,
        ILogger<AlertaService> logger)
    {
        _scoreRepo = scoreRepo;
        _sugestaoRepo = sugestaoRepo;
        _alertaRepo = alertaRepo;
        _subprefeituraRepo = subprefeituraRepo;
        _logger = logger;
    }

    public async Task<Alerta?> GerarAlertaAsync(Guid regiaoId, CancellationToken ct = default)
    {
        var subprefeituras = await _subprefeituraRepo.ObterAtivasAsync();
        var subprefeiturasDaRegiao = subprefeituras.Where(s => s.RegiaoId == regiaoId).ToList();

        if (subprefeiturasDaRegiao.Count == 0)
            return null;

        var scoresAltos = new List<ScorePerigo>();
        foreach (var sub in subprefeiturasDaRegiao)
        {
            var ultimoScore = await _scoreRepo.ObterUltimoAsync(sub.Id);
            if (ultimoScore?.Faixa == FaixaRisco.ALTO)
                scoresAltos.Add(ultimoScore);
        }

        if (scoresAltos.Count == 0)
            return null;

        var scoreMax = scoresAltos.MaxBy(s => s.Valor)!;
        var sugestoes = await _sugestaoRepo.ObterPorCategoriaEFaixaAsync("GERAL", FaixaRisco.ALTO);

        var alerta = new Alerta
        {
            RegiaoId = regiaoId,
            ScoreId = scoreMax.Id,
            Mensagem = $"Risco ALTO detectado. Score máximo: {scoreMax.Valor:F1}",
            Timestamp = DateTime.UtcNow
        };

        var sugestoesList = sugestoes.ToList();
        for (int i = 0; i < sugestoesList.Count; i++)
        {
            alerta.AlertaSugestoes.Add(new AlertaSugestao
            {
                AlertaId = alerta.Id,
                SugestaoId = sugestoesList[i].Id,
                Ordem = i + 1
            });
        }

        await _alertaRepo.AdicionarAsync(alerta);
        await _alertaRepo.SalvarAsync();

        _logger.LogInformation("Alerta gerado para região {RegiaoId}: {Mensagem}", regiaoId, alerta.Mensagem);

        return alerta;
    }
}
