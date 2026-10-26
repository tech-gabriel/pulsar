namespace Pulsar.API.Services.Interfaces;

public interface IAgregadoDiarioService
{
    /// <summary>
    /// Recalcula e grava o agregado do dia local corrente e do anterior para a
    /// subprefeitura, e também o agregado horário da hora UTC atual e da anterior.
    /// Idempotente: pode rodar quantas vezes quiser no mesmo dia.
    /// </summary>
    Task AtualizarRecentesAsync(Guid subprefeituraId, CancellationToken ct = default);
}
