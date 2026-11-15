using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Orquestra a busca de endereços: valida a consulta, cacheia resultados por termo
/// (poupando a quota do provedor) e mapeia o resultado bruto para DTO.
/// </summary>
public class BuscaService : IBuscaService
{
    /// <summary>Tamanho mínimo da consulta para acionar o geocoding.</summary>
    public const int MinChars = 3;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);

    private readonly IGeocodingClient _geocodingClient;
    private readonly IMemoryCache _cache;

    public BuscaService(IGeocodingClient geocodingClient, IMemoryCache cache)
    {
        _geocodingClient = geocodingClient;
        _cache = cache;
    }

    public async Task<IReadOnlyList<EnderecoBuscaDto>> BuscarEnderecosAsync(string? consulta, CancellationToken ct = default)
    {
        var termo = consulta?.Trim() ?? string.Empty;
        if (termo.Length < MinChars)
            return [];

        var chave = $"busca:{termo.ToLowerInvariant()}";
        if (_cache.TryGetValue(chave, out IReadOnlyList<EnderecoBuscaDto>? cached) && cached is not null)
            return cached;

        var resultados = await _geocodingClient.BuscarAsync(termo, ct);
        var dtos = resultados
            .Select(r => new EnderecoBuscaDto
            {
                Nome = string.IsNullOrWhiteSpace(r.Nome) ? r.Descricao : r.Nome,
                Descricao = r.Descricao,
                Tipo = r.Tipo,
                Latitude = r.Latitude,
                Longitude = r.Longitude,
            })
            .ToList();

        _cache.Set(chave, (IReadOnlyList<EnderecoBuscaDto>)dtos, CacheTtl);
        return dtos;
    }

    /// <summary>
    /// A rua não muda: o cache vale um dia, pelo ponto arredondado a uns 10 m (o centro de um trecho
    /// é sempre o mesmo, então cada trecho custa uma consulta ao MapTiler por dia).
    /// </summary>
    public async Task<string?> RuaPertoAsync(double lat, double lon, CancellationToken ct = default)
    {
        var chave = string.Create(System.Globalization.CultureInfo.InvariantCulture, $"rua:{lat:0.0000},{lon:0.0000}");
        if (_cache.TryGetValue(chave, out string? cached)) return cached;
        var rua = await _geocodingClient.RuaPertoAsync(lat, lon, ct);
        _cache.Set(chave, rua, TimeSpan.FromDays(1));
        return rua;
    }
}
