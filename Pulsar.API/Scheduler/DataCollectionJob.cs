using Pulsar.API.Services.Interfaces;

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
        // O BackgroundService é singleton; o runner é scoped → criamos um escopo por ciclo.
        using var scope = _scopeFactory.CreateScope();
        var runner = scope.ServiceProvider.GetRequiredService<IColetaRunner>();

        try
        {
            await runner.ExecutarCicloAsync(ct);
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
