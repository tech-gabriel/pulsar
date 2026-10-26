namespace Pulsar.API.Services.Interfaces;

public interface IAlagamentoCgeService
{
    /// <summary>Lê a página do CGE-SP de hoje e grava os pontos. Lança se o CGE não responder.</summary>
    Task AtualizarAsync(CancellationToken ct = default);
}
