using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/usuarios/{usuarioId:guid}/locais")]
[Authorize]
public class LocaisController : ControllerBase
{
    private readonly ILocaisSalvosService _locais;

    public LocaisController(ILocaisSalvosService locais) => _locais = locais;

    /// <summary>Retorna a casa e o trabalho salvos pela pessoa.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<LocalSalvoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Listar(Guid usuarioId)
    {
        if (!UsuarioAutorizado(usuarioId))
            return Forbid();
        return Ok(await _locais.ListarAsync(usuarioId));
    }

    /// <summary>Salva (ou troca) a casa ou o trabalho e acompanha a subprefeitura, se couber.</summary>
    [HttpPut("{tipo}")]
    [ProducesResponseType(typeof(SalvarLocalResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Salvar(Guid usuarioId, string tipo, [FromBody] SalvarLocalRequestDto request)
    {
        if (!UsuarioAutorizado(usuarioId))
            return Forbid();
        if (!TryTipo(tipo, out var t))
            return NotFound(new { mensagem = "Tipo de local desconhecido." });

        try
        {
            return Ok(await _locais.SalvarAsync(usuarioId, t, request));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
    }

    /// <summary>Apaga a casa ou o trabalho. As subprefeituras favoritas não mudam.</summary>
    [HttpDelete("{tipo}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Apagar(Guid usuarioId, string tipo)
    {
        if (!UsuarioAutorizado(usuarioId))
            return Forbid();
        if (!TryTipo(tipo, out var t) || !await _locais.ApagarAsync(usuarioId, t))
            return NotFound(new { mensagem = "Local não encontrado." });
        return NoContent();
    }

    private static bool TryTipo(string valor, out TipoLocal tipo)
    {
        // Só os nomes; Enum.TryParse sozinho aceitaria "7" ou "0".
        switch (valor.ToLowerInvariant())
        {
            case "casa": tipo = TipoLocal.CASA; return true;
            case "trabalho": tipo = TipoLocal.TRABALHO; return true;
            default: tipo = default; return false;
        }
    }

    private bool UsuarioAutorizado(Guid usuarioId)
    {
        var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subClaim, out var tokenUserId) && tokenUserId == usuarioId;
    }
}
