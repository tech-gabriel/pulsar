using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Decora <see cref="INoticiaClient"/> com cache em memória (15 min), evitando
/// martelar a fonte externa a cada requisição do frontend.
/// </summary>
public class NoticiaService : INoticiaService
{
    private const string CacheKey = "noticias:cgesp";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(15);

    private readonly INoticiaClient _client;
    private readonly IMemoryCache _cache;
    private readonly ILogger<NoticiaService> _logger;

    public NoticiaService(INoticiaClient client, IMemoryCache cache, ILogger<NoticiaService> logger)
    {
        _client = client;
        _cache = cache;
        _logger = logger;
    }

    public async Task<IReadOnlyList<NoticiaDto>> ObterNoticiasAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out IReadOnlyList<NoticiaDto>? cached) && cached is not null)
            return cached;

        var noticias = await _client.ObterNoticiasAsync(ct);
        _cache.Set(CacheKey, noticias, CacheDuration);
        _logger.LogInformation("Notícias do CGE-SP atualizadas: {Total} itens.", noticias.Count);
        return noticias;
    }
}
