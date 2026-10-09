using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.API.Controllers;

/// <summary>
/// Estatísticas públicas das páginas de SEO. Lido pelo build do site
/// (scripts/gerar-snapshot-regioes.mjs), por isso sem login.
/// </summary>
[ApiController]
[Route("api/estatisticas")]
[AllowAnonymous]
public class EstatisticasController : ControllerBase
{
    private static readonly TimeZoneInfo FusoSaoPaulo = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    private const string ChaveCache = "estatisticas-regioes";
    // O rollup muda ao longo do dia e o build chama ~1x/semana: 1 h não atrasa nada.
    private static readonly TimeSpan DuracaoCache = TimeSpan.FromHours(1);

    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly IAgregadoDiarioRepository _agregadoRepo;
    private readonly IMemoryCache _cache;

    public EstatisticasController(
        ISubprefeituraRepository subprefeituraRepo, IAgregadoDiarioRepository agregadoRepo, IMemoryCache cache)
    {
        _subprefeituraRepo = subprefeituraRepo;
        _agregadoRepo = agregadoRepo;
        _cache = cache;
    }

    /// <summary>
    /// Estatísticas dos últimos 90 dias por subprefeitura e por zona, chaveadas pelo slug da página.
    /// Público, então protegido em duas camadas: cache (chamada em loop não chega ao banco) e
    /// rate limit por IP.
    /// </summary>
    [HttpGet("regioes")]
    [EnableRateLimiting("estatisticas")]
    [ProducesResponseType(typeof(EstatisticasRegioesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Regioes()
    {
        var resultado = await _cache.GetOrCreateAsync(ChaveCache, async entrada =>
        {
            entrada.AbsoluteExpirationRelativeToNow = DuracaoCache;
            var subs = await _subprefeituraRepo.ObterAtivasComResumoAsync();
            var linhas = await _agregadoRepo.ObterRecentesAsync(EstatisticasRegioes.JanelaDias);
            var hoje = FusoLocal.DiaLocal(DateTime.UtcNow, FusoSaoPaulo);
            return EstatisticasRegioes.Calcular(subs, linhas, hoje);
        });
        return Ok(resultado);
    }
}
