using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Pulsar.API.Repositories.Data;

namespace Pulsar.API.Health;

/// <summary>
/// Verifica a saúde do pipeline de coleta: conectividade com o banco e
/// frescor da última leitura climática persistida. Leituras antigas indicam
/// que o <see cref="Scheduler.DataCollectionJob"/> parou ou que a API externa
/// está indisponível há vários ciclos.
/// </summary>
public class ColetaHealthCheck : IHealthCheck
{
    // O ciclo de coleta roda a cada 15 min. Toleramos até 2 ciclos de atraso
    // antes de degradar; ~35 min cobre o atraso normal mais uma folga.
    private static readonly TimeSpan LimiteFrescor = TimeSpan.FromMinutes(35);

    private readonly PulsarDbContext _db;

    public ColetaHealthCheck(PulsarDbContext db) => _db = db;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        DateTime? ultimaColeta;
        try
        {
            ultimaColeta = await _db.LeiturasClimaticas
                .OrderByDescending(l => l.CriadoEm)
                .Select(l => (DateTime?)l.CriadoEm)
                .FirstOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Falha ao consultar o banco de dados.", ex);
        }

        if (ultimaColeta is null)
        {
            // Sem leituras ainda: a aplicação provavelmente acabou de subir e o
            // primeiro ciclo de coleta não rodou. Não é falha, mas não está pleno.
            return HealthCheckResult.Degraded("Nenhuma leitura climática registrada ainda.");
        }

        var idade = DateTime.UtcNow - ultimaColeta.Value;
        var dados = new Dictionary<string, object>
        {
            ["ultimaColetaUtc"] = ultimaColeta.Value,
            ["idadeMinutos"] = Math.Round(idade.TotalMinutes, 1)
        };

        if (idade > LimiteFrescor)
        {
            return HealthCheckResult.Degraded(
                $"Última coleta há {idade.TotalMinutes:F0} min (limite: {LimiteFrescor.TotalMinutes:F0} min).",
                data: dados);
        }

        return HealthCheckResult.Healthy("Coleta em dia.", dados);
    }
}
