using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IPrevisaoService
{
    /// <summary>
    /// Rebusca e persiste a previsão da subprefeitura, respeitando a guarda de idade.
    /// Devolve true se chamou a API, false se pulou porque o dado ainda era fresco.
    /// </summary>
    Task<bool> AtualizarAsync(Guid subprefeituraId, CancellationToken ct = default);

    /// <summary>Faixas futuras de UMA subprefeitura, em ordem crescente. Contexto do motor de notificações.</summary>
    Task<IReadOnlyList<FaixaPrevisaoDto>> ObterFaixasSubprefeituraAsync(
        Guid subprefeituraId, int maxFaixas, CancellationToken ct = default);
}
