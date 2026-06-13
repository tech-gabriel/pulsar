namespace Pulsar.API.Services.Interfaces;

/// <summary>Resultado resumido de um ciclo de coleta.</summary>
public record ColetaResultado(
    int SubprefeiturasProcessadas,
    int ScoresCalculados,
    int AlertasGerados,
    DateTime ConcluidoEm);

/// <summary>
/// Executa um ciclo completo de coleta (clima → scores → alertas). Reutilizado
/// tanto pelo <c>DataCollectionJob</c> (a cada 15min) quanto pela coleta manual
/// disparada por um ADMIN.
/// </summary>
public interface IColetaRunner
{
    Task<ColetaResultado> ExecutarCicloAsync(CancellationToken ct = default);
}
