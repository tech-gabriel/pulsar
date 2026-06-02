using Pulsar.API.DTOs;

namespace Pulsar.API.External.Interfaces;

/// <summary>Abstrai a obtenção de notícias climáticas de uma fonte externa.</summary>
public interface INoticiaClient
{
    Task<IReadOnlyList<NoticiaDto>> ObterNoticiasAsync(CancellationToken ct = default);
}
