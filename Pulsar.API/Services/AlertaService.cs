using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services;

public class AlertaService : IAlertaService
{
    // Janela de deduplicação de notificações: durante um período sustentado de
    // risco ALTO, o ciclo de coleta gera um alerta a cada 15 min, mas só
    // notificamos uma vez por região dentro desta janela para não virar spam.
    private static readonly TimeSpan JanelaNotificacao = TimeSpan.FromHours(1);

    private readonly IScoreRepository _scoreRepo;
    private readonly ISugestaoRepository _sugestaoRepo;
    private readonly IAlertaRepository _alertaRepo;
    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly IRegiaoRepository _regiaoRepo;
    private readonly IPushNotificationService _push;
    private readonly ILogger<AlertaService> _logger;

    public AlertaService(
        IScoreRepository scoreRepo,
        ISugestaoRepository sugestaoRepo,
        IAlertaRepository alertaRepo,
        ISubprefeituraRepository subprefeituraRepo,
        IRegiaoRepository regiaoRepo,
        IPushNotificationService push,
        ILogger<AlertaService> logger)
    {
        _scoreRepo = scoreRepo;
        _sugestaoRepo = sugestaoRepo;
        _alertaRepo = alertaRepo;
        _subprefeituraRepo = subprefeituraRepo;
        _regiaoRepo = regiaoRepo;
        _push = push;
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

        // Antes de criar o novo alerta, vê se já houve um recente para a região:
        // serve de deduplicação do disparo de notificações (ver JanelaNotificacao).
        // Só consultamos quando o push está ativo — senão é trabalho de banco à toa.
        var jaNotificadoRecentemente = false;
        if (_push.Habilitado)
        {
            var recentes = await _alertaRepo.ObterRecentesPorRegiaoAsync(
                regiaoId, (int)JanelaNotificacao.TotalHours);
            jaNotificadoRecentemente = recentes.Any();
        }

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

        if (_push.Habilitado && !jaNotificadoRecentemente)
            await NotificarAsync(regiaoId, alerta.Mensagem, ct);

        return alerta;
    }

    private async Task NotificarAsync(Guid regiaoId, string mensagem, CancellationToken ct)
    {
        if (!_push.Habilitado)
            return;

        try
        {
            var regiao = await _regiaoRepo.ObterPorIdAsync(regiaoId);
            var nome = regiao?.Nome ?? "sua região";
            var payload = new PushPayload(
                Titulo: $"⚠️ Risco alto na zona {nome}",
                Corpo: mensagem,
                Url: "/",
                Tag: $"alerta-{regiaoId}");

            var enviados = await _push.NotificarRegiaoAsync(regiaoId, FaixaRisco.ALTO, payload, ct);
            if (enviados > 0)
                _logger.LogInformation("Notificações push enviadas para região {RegiaoId}: {Total}.", regiaoId, enviados);
        }
        catch (Exception ex)
        {
            // Notificação é best-effort: nunca deve interromper a geração de alertas.
            _logger.LogWarning(ex, "Falha ao notificar push da região {RegiaoId}.", regiaoId);
        }
    }
}
