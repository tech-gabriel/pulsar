using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/rota")]
[Authorize]
public class RotaController : ControllerBase
{
    private const int MaxSubprefeituras = 32;
    private readonly IRotaService _service;

    public RotaController(IRotaService service) => _service = service;

    /// <summary>Veredito de risco de um caminho (subprefeituras em ordem): pode ir, com atenção ou esperar.</summary>
    [HttpPost("avaliar")]
    [EnableRateLimiting("busca")]
    [ProducesResponseType(typeof(RotaAvaliacaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Avaliar([FromBody] AvaliarRotaRequest req, CancellationToken ct)
    {
        if (req.SubprefeituraIds is null || req.SubprefeituraIds.Count is 0 or > MaxSubprefeituras)
            return BadRequest(new { mensagem = $"Informe de 1 a {MaxSubprefeituras} subprefeituras." });
        try
        {
            return Ok(await _service.AvaliarAsync(req.SubprefeituraIds, ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
    }
}
