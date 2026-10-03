namespace Pulsar.API.Services.Interfaces;

public interface IAvisoMigracaoService
{
    /// <summary>Avisa (push + e-mail) quem teve favorito de zona apagado. Idempotente.</summary>
    Task<int> ProcessarPendentesAsync(CancellationToken ct = default);
}
