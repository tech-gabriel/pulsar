using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Scheduler;

/// <summary>
/// Sincroniza as ocorrências do GeoSampa uma vez por dia. Antes era manual e o dado
/// envelhecia sozinho (o WFS é uma janela móvel de ~13,5 meses). Job próprio, e não
/// dentro do ciclo de coleta, para um GeoSampa lento não atrasar clima e push.
/// A Prefeitura publica com semanas de atraso; diário basta.
/// </summary>
public class SincronizacaoOcorrenciasJob : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(24);
    // Folga para o startup (migrations, primeira coleta) terminar antes.
    private static readonly TimeSpan AtrasoInicial = TimeSpan.FromMinutes(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SincronizacaoOcorrenciasJob> _logger;

    public SincronizacaoOcorrenciasJob(IServiceScopeFactory scopeFactory, ILogger<SincronizacaoOcorrenciasJob> logger)
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
                await SincronizarAsync(stoppingToken);
                await Task.Delay(Intervalo, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Desligamento do servidor.
        }
    }

    private async Task SincronizarAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var servico = scope.ServiceProvider.GetRequiredService<IOcorrenciaIngestionService>();
        try
        {
            await servico.SincronizarAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Falha (ex.: GeoSampa fora) não derruba o job; tenta de novo no dia seguinte.
            _logger.LogError(ex, "Falha na sincronização diária do GeoSampa.");
        }
    }
}
