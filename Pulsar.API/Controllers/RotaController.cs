using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/rota")]
[Authorize]
public class RotaController : ControllerBase
{
    private const int MaxSubprefeituras = 32;
    private readonly IRotaService _service;
    private readonly IAvisoRotaService _aviso;
    private readonly ISubprefeituraRepository _subprefeituras;

    public RotaController(IRotaService service, IAvisoRotaService aviso, ISubprefeituraRepository subprefeituras)
    {
        _service = service;
        _aviso = aviso;
        _subprefeituras = subprefeituras;
    }

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

    /// <summary>Guarda o pedido "me avise quando melhorar" da pessoa (um por vez).</summary>
    [HttpPost("aviso")]
    [EnableRateLimiting("busca")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PedirAviso([FromBody] PedirAvisoRotaRequest req, CancellationToken ct)
    {
        if (req.SubprefeituraIds is null || req.SubprefeituraIds.Count is 0 or > MaxSubprefeituras
            || req.SubprefeituraIds.Distinct().Count() != req.SubprefeituraIds.Count)
            return BadRequest(new { mensagem = $"Informe de 1 a {MaxSubprefeituras} subprefeituras, sem repetir." });
        var destino = req.Destino?.Trim();
        if (string.IsNullOrEmpty(destino) || destino.Length > 80)
            return BadRequest(new { mensagem = "Informe o destino, com até 80 caracteres." });
        if (UsuarioId() is not { } usuarioId)
            return Unauthorized();
        // O pedido vira cálculo a cada ciclo do job: id que não é de subprefeitura ativa não entra.
        var ativas = (await _subprefeituras.ObterAtivasAsync()).Select(s => s.Id).ToHashSet();
        if (req.SubprefeituraIds.Any(id => !ativas.Contains(id)))
            return BadRequest(new { mensagem = "Subprefeitura desconhecida no caminho." });

        await _aviso.RegistrarAsync(usuarioId, req.SubprefeituraIds, destino, DateTime.UtcNow, ct);
        return NoContent();
    }

    [HttpDelete("aviso")]
    [EnableRateLimiting("busca")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> CancelarAviso(CancellationToken ct)
    {
        if (UsuarioId() is not { } usuarioId)
            return Unauthorized();
        await _aviso.CancelarAsync(usuarioId, ct);
        return NoContent();
    }

    private Guid? UsuarioId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
