using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Pulsar.API.Domain.Cobertura;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/busca")]
[Authorize]
public class BuscaController : ControllerBase
{
    private readonly IBuscaService _buscaService;
    private readonly ISubprefeituraRepository _subprefeituras;
    private readonly ILogger<BuscaController> _logger;

    public BuscaController(IBuscaService buscaService, ISubprefeituraRepository subprefeituras, ILogger<BuscaController> logger)
    {
        _buscaService = buscaService;
        _subprefeituras = subprefeituras;
        _logger = logger;
    }

    /// <summary>Busca endereços por texto (autocomplete), só nas cidades que a pessoa enxerga.</summary>
    [HttpGet("enderecos")]
    [EnableRateLimiting("busca")]
    [ProducesResponseType(typeof(IEnumerable<EnderecoBuscaDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BuscarEnderecos([FromQuery] string? q, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < BuscaService.MinChars)
            return BadRequest(new { mensagem = $"Informe ao menos {BuscaService.MinChars} caracteres na busca." });

        try
        {
            var enderecos = await _buscaService.BuscarEnderecosAsync(q, await CidadesVisiveisAsync(), ct);
            return Ok(enderecos);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao buscar endereços no provedor de geocoding.");
            return StatusCode(StatusCodes.Status502BadGateway,
                new { mensagem = "Não foi possível buscar endereços agora." });
        }
    }

    /// <summary>
    /// A rua mais perto de um ponto de São Paulo, para o rótulo do destino da rota tocado no mapa.
    /// Sem rua (ou com o provedor fora do ar) responde 200 com <c>rua: null</c>: o app cai no nome da região.
    /// </summary>
    [HttpGet("rua")]
    [EnableRateLimiting("busca")]
    [ProducesResponseType(typeof(RuaPertoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RuaPerto([FromQuery] double lat, [FromQuery] double lon, CancellationToken ct)
    {
        // Retângulo largo das cidades que a pessoa enxerga: barra coordenada trocada ou fora da
        // cobertura. "Dentro" negado, porque NaN falha toda comparação e passaria num "fora".
        if (!CoberturaCidades.Dentro(lat, lon, await CidadesVisiveisAsync()))
            return BadRequest(new { mensagem = "Ponto fora da área coberta pelo Pulsar." });

        try
        {
            var rua = await _buscaService.RuaPertoAsync(lat, lon, ct);
            return Ok(new RuaPertoDto(rua?.Nome, rua is null ? null : (int)Math.Round(rua.Metros)));
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Falha na busca reversa de rua.");
            return Ok(new RuaPertoDto(null, null));
        }
    }

    /// <summary>A Baixada fica escondida até o lançamento: só o Admin a alcança.</summary>
    private Task<IReadOnlyList<string>> CidadesVisiveisAsync()
        => _subprefeituras.ObterNomesDasCidadesVisiveisAsync(incluirOcultas: User.IsInRole("ADMIN"));
}
