using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Pulsar.API.Scheduler;

public class DataCollectionJob : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromMinutes(15);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DataCollectionJob> _logger;

    public DataCollectionJob(IServiceScopeFactory scopeFactory, ILogger<DataCollectionJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DataCollectionJob iniciado. Ciclo: {Intervalo} minutos.", Intervalo.TotalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            await ExecutarCicloAsync(stoppingToken);
            await Task.Delay(Intervalo, stoppingToken).ConfigureAwait(false);
        }
    }

    private async Task ExecutarCicloAsync(CancellationToken ct)
    {
        _logger.LogInformation("Iniciando ciclo de coleta: {Hora}", DateTime.UtcNow);

        using var scope = _scopeFactory.CreateScope();
        var climateService = scope.ServiceProvider.GetRequiredService<IClimateService>();
        var scoreService = scope.ServiceProvider.GetRequiredService<IScoreService>();
        var alertaService = scope.ServiceProvider.GetRequiredService<IAlertaService>();
        var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();

        try
        {
            await climateService.ColetarTodasAsync(ct);

            var subprefeituras = await db.Subprefeituras.Where(s => s.Ativa).ToListAsync(ct);
            foreach (var sub in subprefeituras)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    await scoreService.CalcularEPersistirAsync(sub.Id, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha ao calcular score da subprefeitura {Nome}.", sub.Nome);
                }
            }

            var regioes = await db.Regioes.ToListAsync(ct);
            foreach (var regiao in regioes)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    await alertaService.GerarAlertaAsync(regiao.Id, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha ao gerar alerta para região {Nome}.", regiao.Nome);
                }
            }

            _logger.LogInformation("Ciclo de coleta concluído.");
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Ciclo de coleta cancelado.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro inesperado no ciclo de coleta.");
        }
    }
}
