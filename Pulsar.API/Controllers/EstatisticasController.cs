using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly IAgregadoDiarioRepository _agregadoRepo;

    public EstatisticasController(ISubprefeituraRepository subprefeituraRepo, IAgregadoDiarioRepository agregadoRepo)
    {
        _subprefeituraRepo = subprefeituraRepo;
        _agregadoRepo = agregadoRepo;
    }

    // ponytail: sem cache nem rate limit próprio; chamado ~1x/semana pelo build. Adicionar OutputCache se aparecer abuso.
    /// <summary>Estatísticas dos últimos 90 dias por subprefeitura e por zona, chaveadas pelo slug da página.</summary>
    [HttpGet("regioes")]
    [ProducesResponseType(typeof(EstatisticasRegioesDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Regioes()
    {
        var subs = await _subprefeituraRepo.ObterAtivasComResumoAsync();
        var linhas = await _agregadoRepo.ObterRecentesAsync(EstatisticasRegioes.JanelaDias);
        var hoje = FusoLocal.DiaLocal(DateTime.UtcNow, FusoSaoPaulo);
        return Ok(EstatisticasRegioes.Calcular(subs, linhas, hoje));
    }
}
