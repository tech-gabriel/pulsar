namespace Pulsar.API.Services.Interfaces;

/// <summary>Resultado resumido de um ciclo de coleta.</summary>
public record ColetaResultado(
    int SubprefeiturasProcessadas,
    int ScoresCalculados,
    int AlertasGerados,
    DateTime ConcluidoEm);

/// <summary>
/// Executa um ciclo completo de coleta (clima → scores → agregado → previsão → alertas →
/// notificações). Reutilizado tanto pelo <c>DataCollectionJob</c> (a cada 15min) quanto
/// pela coleta manual disparada por um ADMIN.
/// </summary>
/// <remarks>
/// O ciclo pode MANDAR PUSH: a última etapa roda o motor de notificações. O
/// <see cref="ColetaResultado"/> não conta os envios de propósito, para o retorno da coleta
/// manual não mudar de forma; o número sai no log de conclusão do ciclo.
/// </remarks>
public interface IColetaRunner
{
    Task<ColetaResultado> ExecutarCicloAsync(CancellationToken ct = default);
}
