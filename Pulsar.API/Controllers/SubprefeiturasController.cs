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
    private readonly IEstacaoCgeService _estacoesCge;
    private readonly ICemadenService _cemaden;
    private readonly ILogger<SubprefeiturasController> _logger;

    public SubprefeiturasController(
        ISubprefeituraRepository subprefeituraRepository, IPrevisaoService previsaoService, IPontoAlagamentoCgeRepository pontosCge,
        IEstacaoCgeService estacoesCge, ICemadenService cemaden, ILogger<SubprefeiturasController> logger)
    {
        _estacoesCge = estacoesCge;
        _cemaden = cemaden;
        _logger = logger;
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
        var medidas = await ObterChuvaMedidaAsync();
        var cemadenPorSub = await ObterChuvaCemadenAsync();
        var dtos = subs
            .Select(s =>
            {
                var dto = SubprefeituraDto.Preencher(new SubprefeituraResumoDto { Zona = s.Regiao?.Nome ?? string.Empty }, s);
                dto.AlagamentosCge = [.. pontos[s.Id].Select(PontoAlagamentoCgeDto.De)];
                var cemaden = cemadenPorSub.GetValueOrDefault(s.Id);
                dto.ChuvaMedida = ChuvaMedidaDto.De(medidas.GetValueOrDefault(s.Id), cemaden);
                dto.Chuva24h = Chuva24hDto.De(cemaden);
                return dto;
            })
            .OrderByDescending(d => d.ScoreAtual?.Valor ?? -1)
            .ThenBy(d => d.Nome, StringComparer.Ordinal);
        return Ok(dtos);
    }

    /// <summary>
    /// Chuva medida é enfeite da lista, não a lista: se a leitura dos postos falhar, o mapa
    /// abre igual, só com tudo em "estimado".
    /// </summary>
    private async Task<IReadOnlyDictionary<Guid, ChuvaMedidaRegiao>> ObterChuvaMedidaAsync()
    {
        try
        {
            return await _estacoesCge.ObterPorSubprefeituraAsync(DateTime.UtcNow, HttpContext.RequestAborted);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Falha ao ler a chuva medida do CGE-SP para a lista de subprefeituras.");
            return new Dictionary<Guid, ChuvaMedidaRegiao>();
        }
    }

    /// <summary>Mesmo trato do CGE: sem o CEMADEN a lista abre igual, só sem a reserva e sem as 24 h.</summary>
    private async Task<IReadOnlyDictionary<Guid, ChuvaCemadenRegiao>> ObterChuvaCemadenAsync()
    {
        try
        {
            return await _cemaden.ObterPorSubprefeituraAsync(DateTime.UtcNow, HttpContext.RequestAborted);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Falha ao ler a chuva do CEMADEN para a lista de subprefeituras.");
            return new Dictionary<Guid, ChuvaCemadenRegiao>();
        }
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
