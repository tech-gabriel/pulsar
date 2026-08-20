using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IPrevisaoService
{
    /// <summary>
    /// Rebusca e persiste a previsão da subprefeitura, respeitando a guarda de idade.
    /// Devolve true se chamou a API, false se pulou porque o dado ainda era fresco.
    /// </summary>
    Task<bool> AtualizarAsync(Guid subprefeituraId, CancellationToken ct = default);

    /// <summary>Faixas futuras da região, agregadas por pior caso, no máximo maxFaixas.</summary>
    Task<IReadOnlyList<FaixaPrevisaoDto>> ObterFaixasRegiaoAsync(
        Guid regiaoId, int maxFaixas, CancellationToken ct = default);
}
