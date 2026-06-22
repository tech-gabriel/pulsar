using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

/// <summary>Busca de endereços/ruas com validação e cache, sobre um provedor de geocoding.</summary>
public interface IBuscaService
{
    Task<IReadOnlyList<EnderecoBuscaDto>> BuscarEnderecosAsync(string? consulta, CancellationToken ct = default);
}
