using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Scheduler;

/// <summary>
/// Sincroniza as ocorrências do GeoSampa uma vez por dia. Antes era manual e o dado
/// envelhecia sozinho (o WFS é uma janela móvel de ~13,5 meses). Job próprio, e não
/// dentro do ciclo de coleta, para um GeoSampa lento não atrasar clima e push.
/// A Prefeitura publica com semanas de atraso; diário basta. Cada rodada fica gravada em
/// ExecucoesSincronizacao para o painel de qualidade mostrar quando o GeoSampa para.
/// </summary>
public class SincronizacaoOcorrenciasJob : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(24);
    /// <summary>Depois de uma falha não espera o dia inteiro: o GeoSampa costuma voltar em horas.</summary>
    public static readonly TimeSpan IntervaloAposFalha = TimeSpan.FromHours(2);
    private const int RetencaoDias = 90;
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
                await Task.Delay(await ExecutarAsync(stoppingToken), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            // Desligamento do servidor.
        }
    }

    /// <summary>Uma rodada: sincroniza, grava a execução e devolve quanto esperar até a próxima.</summary>
    public async Task<TimeSpan> ExecutarAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var servico = scope.ServiceProvider.GetRequiredService<IOcorrenciaIngestionService>();
        var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
        var execucao = new ExecucaoSincronizacao { Fonte = ExecucaoSincronizacao.FonteGeoSampa, IniciadoEm = DateTime.UtcNow };
        try
        {
            var resultado = await servico.SincronizarAsync(ct);
            execucao.Sucesso = true;
            execucao.Lidas = resultado.Total;
            execucao.Novas = resultado.Novas;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Falha (ex.: GeoSampa fora) não derruba o job; tenta de novo em IntervaloAposFalha.
            _logger.LogError(ex, "Falha na sincronização do GeoSampa.");
            execucao.Erro = ex.Message.Length > 1000 ? ex.Message[..1000] : ex.Message;
        }

        try
        {
            execucao.FinalizadoEm = DateTime.UtcNow;
            db.ExecucoesSincronizacao.Add(execucao);
            await db.SaveChangesAsync(ct);
            var limite = execucao.IniciadoEm.AddDays(-RetencaoDias);
            await db.ExecucoesSincronizacao.Where(x => x.IniciadoEm < limite).ExecuteDeleteAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Sem o registro o painel fica cego, mas o sync em si já rodou.
            _logger.LogError(ex, "Falha ao gravar a execução do sync do GeoSampa.");
        }

        return execucao.Sucesso ? Intervalo : IntervaloAposFalha;
    }
}
