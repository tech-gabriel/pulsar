namespace Pulsar.API.Services.Interfaces;

public interface IAgregadoDiarioService
{
    /// <summary>
    /// Recalcula e grava o agregado do dia local corrente e do anterior para a
    /// subprefeitura. Idempotente: pode rodar quantas vezes quiser no mesmo dia.
    /// </summary>
    Task AtualizarRecentesAsync(Guid subprefeituraId, CancellationToken ct = default);
}
