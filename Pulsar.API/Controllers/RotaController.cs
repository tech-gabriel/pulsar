using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Rota;

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
        if (!TentarCaminho(req.PontoOrigem, req.PontoDestino, out var caminho))
            return BadRequest(new { mensagem = MensagemPontos });

        try
        {
            return Ok(await _service.AvaliarAsync(req.SubprefeituraIds, caminho, ct));
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
        if (!TentarCaminho(req.PontoOrigem, req.PontoDestino, out var caminho))
            return BadRequest(new { mensagem = MensagemPontos });
        if (UsuarioId() is not { } usuarioId)
            return Unauthorized();
        // O pedido vira cálculo a cada ciclo do job: id que não é de subprefeitura ativa não entra.
        var ativas = (await _subprefeituras.ObterAtivasAsync()).Select(s => s.Id).ToHashSet();
        if (req.SubprefeituraIds.Any(id => !ativas.Contains(id)))
            return BadRequest(new { mensagem = "Subprefeitura desconhecida no caminho." });

        await _aviso.RegistrarAsync(usuarioId, req.SubprefeituraIds, destino, DateTime.UtcNow, caminho, ct);
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

    private const string MensagemPontos = "Informe a origem e o destino do caminho, com latitude e longitude válidas.";

    /// <summary>
    /// Origem e destino vêm juntos ou não vêm (app antigo em cache: a rota segue pela área).
    /// Devolve false quando só um veio ou quando algum ponto não é uma coordenada.
    /// </summary>
    private static bool TentarCaminho(PontoRotaDto? origem, PontoRotaDto? destino, out CaminhoRota? caminho)
    {
        caminho = null;
        if (origem is null && destino is null) return true;
        if (origem is null || destino is null || !Valido(origem) || !Valido(destino)) return false;

        caminho = new CaminhoRota(origem.Lat, origem.Lon, destino.Lat, destino.Lon);
        return true;

        // NaN falha nas duas comparações, então não passa.
        static bool Valido(PontoRotaDto p) => Math.Abs(p.Lat) <= 90 && Math.Abs(p.Lon) <= 180;
    }

    private Guid? UsuarioId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
