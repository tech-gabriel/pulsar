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
}
