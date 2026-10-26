using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;

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
    private readonly IPontoAlagamentoCgeRepository _pontosCge;

    public SubprefeiturasController(
        ISubprefeituraRepository subprefeituraRepository, IPrevisaoService previsaoService, IPontoAlagamentoCgeRepository pontosCge)
    {
        _subprefeituraRepository = subprefeituraRepository;
        _previsaoService = previsaoService;
        _pontosCge = pontosCge;
    }

    /// <summary>Todas as subprefeituras ativas com risco atual, pior primeiro.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SubprefeituraResumoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterTodas()
    {
        var subs = await _subprefeituraRepository.ObterAtivasComResumoAsync();
        // Mesma validade que o aviso de Perigo usa: o mapa não mostra ponto que o push não mandaria.
        var pontos = (await _pontosCge.ObterAtivosAsync(DateTime.UtcNow - LimiaresNotificacao.ValidadePontoCge))
            .ToLookup(p => p.SubprefeituraId);
        var dtos = subs
            .Select(s =>
            {
                var dto = SubprefeituraDto.Preencher(new SubprefeituraResumoDto { Zona = s.Regiao?.Nome ?? string.Empty }, s);
                dto.AlagamentosCge = [.. pontos[s.Id].Select(PontoAlagamentoCgeDto.De)];
                return dto;
            })
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
