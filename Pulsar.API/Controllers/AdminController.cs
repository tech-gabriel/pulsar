using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "ADMIN,SUPORTE")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService) => _adminService = adminService;

    /// <summary>Lista todos os usuários do sistema. Acessível a ADMIN e SUPORTE (leitura).</summary>
    [HttpGet("usuarios")]
    [ProducesResponseType(typeof(IReadOnlyList<UsuarioAdminDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListarUsuarios()
        => Ok(await _adminService.ListarUsuariosAsync());

    /// <summary>Altera a role de acesso de um usuário. Apenas ADMIN.</summary>
    [HttpPut("usuarios/{id:guid}/role")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(typeof(UsuarioAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AlterarRole(Guid id, [FromBody] AlterarRoleRequestDto request)
    {
        try
        {
            var resultado = await _adminService.AlterarRoleAsync(UsuarioAtualId(), id, request.Role);
            return Ok(resultado);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensagem = ex.Message });
        }
    }

    /// <summary>Ativa ou desativa a conta de um usuário. Apenas ADMIN.</summary>
    [HttpPut("usuarios/{id:guid}/ativo")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(typeof(UsuarioAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AlterarAtivo(Guid id, [FromBody] AlterarAtivoRequestDto request)
    {
        try
        {
            var resultado = await _adminService.AlterarAtivoAsync(UsuarioAtualId(), id, request.Ativo);
            return Ok(resultado);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensagem = ex.Message });
        }
    }

    private Guid UsuarioAtualId()
    {
        var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subClaim, out var id) ? id : Guid.Empty;
    }
}
