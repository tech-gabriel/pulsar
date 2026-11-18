using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

/// <summary>Busca de endereços/ruas com validação e cache, sobre um provedor de geocoding.</summary>
public interface IBuscaService
{
    Task<IReadOnlyList<EnderecoBuscaDto>> BuscarEnderecosAsync(string? consulta, IReadOnlyCollection<string> cidades, CancellationToken ct = default);

    /// <summary>A rua mais perto do ponto, para dar nome a um destino tocado no mapa. Null quando não há.</summary>
    Task<Pulsar.API.External.Interfaces.RuaProxima?> RuaPertoAsync(double lat, double lon, CancellationToken ct = default);
}
