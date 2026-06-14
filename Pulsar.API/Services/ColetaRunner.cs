using Microsoft.EntityFrameworkCore;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Orquestra um ciclo de coleta: coleta climática de todas as subprefeituras ativas,
/// recalcula os scores e gera alertas por região. Resiliente a falhas parciais
/// (uma subprefeitura/região com erro não interrompe as demais).
/// </summary>
public class ColetaRunner : IColetaRunner
{
    private readonly IClimateService _climateService;
    private readonly IScoreService _scoreService;
    private readonly IAlertaService _alertaService;
    private readonly PulsarDbContext _db;
    private readonly ILogger<ColetaRunner> _logger;

    public ColetaRunner(
        IClimateService climateService,
        IScoreService scoreService,
        IAlertaService alertaService,
        PulsarDbContext db,
        ILogger<ColetaRunner> logger)
    {
        _climateService = climateService;
        _scoreService = scoreService;
        _alertaService = alertaService;
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

        _logger.LogInformation("Ciclo de coleta concluído.");
        return new ColetaResultado(subprefeituras.Count, scoresCalculados, alertasGerados, DateTime.UtcNow);
    }
}
