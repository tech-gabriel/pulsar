using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

/// <summary>
/// Subprefeitura como unidade do app (SP3): lista única e previsão própria. Divide a rota
/// base com o HistoricoController, que serve /{id}/historico.
/// </summary>
[ApiController]
[Route("api/subprefeituras")]
[Authorize]
public class SubprefeiturasController : ControllerBase
{
    /// <summary>8 faixas de 3h = as 24h que o detalhe mostra (mesmo teto da rota por região).</summary>
    private const int MaxFaixasPrevisao = 8;

    private readonly ISubprefeituraRepository _subprefeituraRepository;
    private readonly IPrevisaoService _previsaoService;

    public SubprefeiturasController(ISubprefeituraRepository subprefeituraRepository, IPrevisaoService previsaoService)
    {
        _subprefeituraRepository = subprefeituraRepository;
        _previsaoService = previsaoService;
    }

    /// <summary>Todas as subprefeituras ativas com risco atual, pior primeiro.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SubprefeituraResumoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterTodas()
    {
        var subs = await _subprefeituraRepository.ObterAtivasComResumoAsync();
        var dtos = subs
            .Select(s => SubprefeituraDto.Preencher(new SubprefeituraResumoDto { Zona = s.Regiao?.Nome ?? string.Empty }, s))
            .OrderByDescending(d => d.ScoreAtual?.Valor ?? -1)
            .ThenBy(d => d.Nome, StringComparer.Ordinal);
        return Ok(dtos);
    }

    /// <summary>
    /// Faixas de 3h previstas para a PRÓPRIA subprefeitura (não o pior caso da zona),
    /// em UTC e crescentes. Lista vazia é legítima: ainda não houve coleta.
    /// </summary>
    [HttpGet("{id:guid}/previsao")]
    [ProducesResponseType(typeof(IReadOnlyList<FaixaPrevisaoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObterPrevisao(Guid id, CancellationToken ct)
    {
        var sub = await _subprefeituraRepository.ObterPorIdAsync(id);
        if (sub is null || !sub.Ativa)
            return NotFound(new { mensagem = "Subprefeitura não encontrada." });

        return Ok(await _previsaoService.ObterFaixasSubprefeituraAsync(id, MaxFaixasPrevisao, ct));
    }
}
