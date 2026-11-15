using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Pulsar.API.DTOs;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/busca")]
[Authorize]
public class BuscaController : ControllerBase
{
    private readonly IBuscaService _buscaService;
    private readonly ILogger<BuscaController> _logger;

    public BuscaController(IBuscaService buscaService, ILogger<BuscaController> logger)
    {
        _buscaService = buscaService;
        _logger = logger;
    }

    /// <summary>Busca endereços/ruas de São Paulo por texto (autocomplete).</summary>
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
            var enderecos = await _buscaService.BuscarEnderecosAsync(q, ct);
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
        // Retângulo largo da Grande São Paulo: barra coordenada trocada ou fora da cidade.
        if (lat is < -24.1 or > -23.2 || lon is < -47.0 or > -46.2)
            return BadRequest(new { mensagem = "Ponto fora de São Paulo." });

        try
        {
            return Ok(new RuaPertoDto(await _buscaService.RuaPertoAsync(lat, lon, ct)));
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Falha na busca reversa de rua.");
            return Ok(new RuaPertoDto(null));
        }
    }
}
