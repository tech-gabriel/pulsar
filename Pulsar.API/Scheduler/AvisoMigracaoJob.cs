using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Scheduler;

/// <summary>
/// Roda o aviso único do SP1 de hora em hora (primeiro ciclo 3 min após subir). Quando todos
/// estiverem avisados, cada rodada é uma consulta vazia; o job sai junto com a tabela no PR de
/// limpeza.
/// </summary>
public class AvisoMigracaoJob : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(1);
    private static readonly TimeSpan AtrasoInicial = TimeSpan.FromMinutes(3);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AvisoMigracaoJob> _logger;

    public AvisoMigracaoJob(IServiceScopeFactory scopeFactory, ILogger<AvisoMigracaoJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(AtrasoInicial, stoppingToken);
            while (!stoppingToken.IsCancellationRequested)
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    try
                    {
                        var n = await scope.ServiceProvider.GetRequiredService<IAvisoMigracaoService>()
                            .ProcessarPendentesAsync(stoppingToken);
                        if (n > 0) _logger.LogInformation("Aviso de migração processado para {Total} pessoa(s).", n);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        _logger.LogError(ex, "Falha no aviso de migração.");
                    }
                }
                await Task.Delay(Intervalo, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Desligamento do servidor.
        }
    }
}
