using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/ocorrencias")]
[Authorize]
public class OcorrenciasController : ControllerBase
{
    private readonly IOcorrenciaConsultaService _service;

    public OcorrenciasController(IOcorrenciaConsultaService service) => _service = service;

    /// <summary>Ocorrências de alagamento/inundação dos últimos 12 meses (para o mapa).</summary>
    [HttpGet("alagamento")]
    [ProducesResponseType(typeof(IReadOnlyList<OcorrenciaAlagamentoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterAlagamento()
        => Ok(await _service.ObterRecentesAsync());

    /// <summary>Resumo das ocorrências perto de um ponto + risco elevado conforme a chuva atual.</summary>
    [HttpGet("alagamento/proximas")]
    [ProducesResponseType(typeof(OcorrenciasProximasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ObterProximas(
        [FromQuery] double lat, [FromQuery] double lon, [FromQuery] int raioMetros = 500)
    {
        if (lat is < -90 or > 90 || lon is < -180 or > 180 || raioMetros is <= 0 or > 20000)
            return BadRequest(new { mensagem = "Parâmetros de localização inválidos." });

        return Ok(await _service.ObterProximasAsync(lat, lon, raioMetros));
    }
}
