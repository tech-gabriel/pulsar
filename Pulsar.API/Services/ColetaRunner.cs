using Microsoft.EntityFrameworkCore;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Orquestra um ciclo de coleta, nesta ordem: coleta climática das subprefeituras ativas,
/// recalcula os scores, atualiza o agregado diário e a previsão, gera os alertas por região
/// e, por último, roda o motor de notificações. Resiliente a falhas parciais (uma
/// subprefeitura, região ou etapa com erro não interrompe as demais).
/// </summary>
/// <remarks>
/// A ordem não é arbitrária: o motor de notificações lê do banco o estado que as etapas
/// anteriores acabaram de gravar, então ele vem por último e uma vez só. Quem reordenar
/// isto muda o que o usuário recebe, não só a performance do ciclo.
/// </remarks>
public class ColetaRunner : IColetaRunner
{
    private readonly IClimateService _climateService;
    private readonly IScoreService _scoreService;
    private readonly IAlertaService _alertaService;
    private readonly IAgregadoDiarioService _agregadoService;
    private readonly IPrevisaoService _previsaoService;
    private readonly IMotorNotificacoes _motor;
    private readonly PulsarDbContext _db;
    private readonly ILogger<ColetaRunner> _logger;

    public ColetaRunner(
        IClimateService climateService,
        IScoreService scoreService,
        IAlertaService alertaService,
        IAgregadoDiarioService agregadoService,
        IPrevisaoService previsaoService,
        IMotorNotificacoes motor,
        PulsarDbContext db,
        ILogger<ColetaRunner> logger)
    {
        _climateService = climateService;
        _scoreService = scoreService;
        _alertaService = alertaService;
        _agregadoService = agregadoService;
        _previsaoService = previsaoService;
        _motor = motor;
        _db = db;
        _logger = logger;
    }

    public async Task<ColetaResultado> ExecutarCicloAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("Iniciando ciclo de coleta: {Hora}", DateTime.UtcNow);

        await _climateService.ColetarTodasAsync(ct);

        var subprefeituras = await _db.Subprefeituras.Where(s => s.Ativa).ToListAsync(ct);
        var scoresCalculados = 0;
        foreach (var sub in subprefeituras)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                await _scoreService.CalcularEPersistirAsync(sub.Id, ct);
                scoresCalculados++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao calcular score da subprefeitura {Nome}.", sub.Nome);
            }

            // try/catch próprio: o agregado é o dado que sobrevive, mas uma falha nele
            // não pode derrubar o ciclo nem descartar o score que acabou de ser gravado.
            try
            {
                await _agregadoService.AtualizarRecentesAsync(sub.Id, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao atualizar agregado diário de {Nome}.", sub.Nome);
            }

            // try/catch próprio pelo mesmo motivo do agregado: a previsão é a parte que
            // depende de rede externa, e uma falha dela não pode descartar o score nem o
            // agregado que acabaram de ser gravados.
            try
            {
                await _previsaoService.AtualizarAsync(sub.Id, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao atualizar previsão de {Nome}.", sub.Nome);
            }
        }

        var regioes = await _db.Regioes.ToListAsync(ct);
        var alertasGerados = 0;
        foreach (var regiao in regioes)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var alerta = await _alertaService.GerarAlertaAsync(regiao.Id, ct);
                if (alerta is not null) alertasGerados++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao gerar alerta para região {Nome}.", regiao.Nome);
            }
        }

        var pushEnviados = await AvaliarNotificacoesAsync(ct);

        // "pelo menos": uma exceção que estoure DEPOIS de o push sair (a limpeza de inscrições
        // mortas, por exemplo) leva junto a soma daquela região. A falha só ao gravar no
        // livro-caixa é a exceção da exceção e segue contando, porque lá o push comprovadamente
        // saiu. O número acompanha volume, não audita entrega.
        _logger.LogInformation(
            "Ciclo de coleta concluído. Push enviados: pelo menos {Push}.", pushEnviados);

        return new ColetaResultado(subprefeituras.Count, scoresCalculados, alertasGerados, DateTime.UtcNow);
    }

    /// <summary>
    /// Um disparo por ciclo, depois de score, agregado, previsão e alertas estarem gravados:
    /// o motor lê estado consolidado, não estado a meio caminho. Devolve quantos push saíram,
    /// ou zero quando o ciclo foi cancelado ou o motor falhou.
    /// </summary>
    private async Task<int> AvaliarNotificacoesAsync(CancellationToken ct)
    {
        // Ciclo cancelado é desligamento no meio do caminho, e os loops acima já quebraram:
        // parte das subprefeituras ficou sem score e parte das regiões sem alerta. Notificar
        // em cima disso é decidir sobre dado pela metade, e o custo de esperar é de 15 min.
        if (ct.IsCancellationRequested)
            return 0;

        // try/catch aqui e não só lá dentro: o motor protege cada REGIÃO, mas o teste de
        // Habilitado e a consulta de regiões ficam fora de qualquer catch dele, então um banco
        // fora do ar sobe até aqui. Este é o mesmo ciclo que grava o score e o agregado
        // diário, a única memória de longo prazo do sistema, e um problema no envio de
        // notificação não pode derrubá-lo.
        try
        {
            return await _motor.AvaliarEDispararAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao avaliar notificações do ciclo.");
            return 0;
        }
    }
}
