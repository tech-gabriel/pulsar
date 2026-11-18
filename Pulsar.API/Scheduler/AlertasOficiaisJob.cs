using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Alertas;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Scheduler;

/// <summary>
/// Lê os alertas oficiais da Defesa Civil num ritmo próprio, fora do ciclo de coleta: 5 min quando
/// há algo acontecendo, 15 min no calmo (<see cref="RitmoAlertas"/>). O push sai pelo motor de
/// notificações, no ciclo de coleta, a partir do que este job gravou; alerta Extremo novo chama o
/// motor na hora (decisão do desenho: Extremo avisa na hora).
/// </summary>
public class AlertasOficiaisJob : BackgroundService
{
    /// <summary>Até quando um score com chuva medida conta como "chovendo agora" para apertar o ritmo.</summary>
    private static readonly TimeSpan JanelaChuvaMedida = TimeSpan.FromMinutes(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AlertasOficiaisJob> _logger;

    public AlertasOficiaisJob(IServiceScopeFactory scopeFactory, ILogger<AlertasOficiaisJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AlertasOficiaisJob iniciado: leitura a cada {Atento} ou {Calmo} minutos.",
            RitmoAlertas.Atento.TotalMinutes, RitmoAlertas.Calmo.TotalMinutes);
        while (!stoppingToken.IsCancellationRequested)
        {
            var proximo = await ExecutarUmCicloAsync(stoppingToken);
            await Task.Delay(proximo, stoppingToken).ConfigureAwait(false);
        }
    }

    public async Task<TimeSpan> ExecutarUmCicloAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var servico = scope.ServiceProvider.GetRequiredService<IAlertaOficialService>();
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            var agora = DateTime.UtcNow;

            var resultado = await servico.SincronizarAsync(agora, ct);
            if (resultado.NovosExtremos > 0)
            {
                var enviados = await scope.ServiceProvider.GetRequiredService<IMotorNotificacoes>().AvaliarEDispararAsync(ct);
                _logger.LogInformation("Alerta Extremo novo: motor de push rodou na hora ({Enviados} envio(s)).", enviados);
            }
            var haAtivo = (await servico.AtivosPorAreaAsync(agora, ct)).Count > 0;
            var desde = agora - JanelaChuvaMedida;
            var haChuva = await db.ScoresPerigo.AnyAsync(s => s.Timestamp >= desde && s.Chuva3hMedidaMm > 0, ct);
            return RitmoAlertas.Proximo(resultado, haAtivo, haChuva);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            return RitmoAlertas.Calmo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro inesperado na leitura dos alertas oficiais.");
            return RitmoAlertas.Calmo;
        }
    }
}
