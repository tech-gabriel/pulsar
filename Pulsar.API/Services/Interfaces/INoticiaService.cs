using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

/// <summary>Fornece notícias climáticas, aplicando cache para evitar excesso de chamadas externas.</summary>
public interface INoticiaService
{
    Task<IReadOnlyList<NoticiaDto>> ObterNoticiasAsync(CancellationToken ct = default);
}
