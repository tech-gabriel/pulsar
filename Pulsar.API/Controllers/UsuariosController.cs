using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize]
public class UsuariosController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IEmailVerificacaoService _emailVerificacao;

    public UsuariosController(IAuthService authService, IEmailVerificacaoService emailVerificacao)
    {
        _authService = authService;
        _emailVerificacao = emailVerificacao;
    }

    /// <summary>Usuário da sessão, atualizado (o front guarda uma cópia que envelhece).</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UsuarioDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Me()
    {
        if (IdDoToken() is not Guid id)
            return Unauthorized();
        try
        {
            return Ok(await _authService.ObterUsuarioAsync(id));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensagem = ex.Message });
        }
    }

    /// <summary>Reenvia o link de confirmação (teto de 3 por hora no serviço).</summary>
    [HttpPost("me/reenviar-confirmacao")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ReenviarConfirmacao()
    {
        if (IdDoToken() is not Guid id)
            return Unauthorized();
        await _emailVerificacao.ReenviarAsync(id);
        return NoContent();
    }

    /// <summary>Encerra a sessão em todos os aparelhos, inclusive o atual (SEC2).</summary>
    [HttpPost("me/sair-de-todos")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SairDeTodos()
    {
        if (IdDoToken() is not Guid id)
            return Unauthorized();
        await _authService.SairDeTodosAsync(id);
        return NoContent();
    }

    /// <summary>Atualiza o perfil do usuário (nome, e-mail, persona e, opcionalmente, senha).</summary>
    [HttpPut("{usuarioId:guid}")]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AtualizarPerfil(Guid usuarioId, [FromBody] AtualizarPerfilRequestDto request)
    {
        if (!UsuarioAutorizado(usuarioId))
            return Forbid();

        try
        {
            var response = await _authService.AtualizarPerfilAsync(usuarioId, request);
            return Ok(response);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensagem = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensagem = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            // Senha atual errada é validação, não sessão: 401 com token faz o app deslogar a pessoa (SEC2).
            return BadRequest(new { mensagem = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
    }

    private Guid? IdDoToken()
    {
        var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subClaim, out var id) ? id : null;
    }

    private bool UsuarioAutorizado(Guid usuarioId) => IdDoToken() == usuarioId;
}
