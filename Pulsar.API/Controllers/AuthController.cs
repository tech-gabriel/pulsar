using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IPasswordResetService _passwordResetService;

    public AuthController(IAuthService authService, IPasswordResetService passwordResetService)
    {
        _authService = authService;
        _passwordResetService = passwordResetService;
    }

    /// <summary>Cadastra um novo usuário.</summary>
    [HttpPost("cadastro")]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Cadastro([FromBody] CadastroRequestDto request)
    {
        try
        {
            var response = await _authService.CadastrarAsync(request);
            return StatusCode(StatusCodes.Status201Created, response);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensagem = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
    }

    /// <summary>Autentica o usuário e retorna um token JWT.</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { mensagem = ex.Message });
        }
    }

    /// <summary>Encerra a sessão (JWT é stateless; o frontend deve descartar o token).</summary>
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Logout()
        => Ok(new { mensagem = "Logout realizado com sucesso." });

    /// <summary>Solicita o e-mail de recuperação de senha. Resposta genérica (não revela se o e-mail existe).</summary>
    [HttpPost("esqueci-senha")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> EsqueciSenha([FromBody] EsqueciSenhaRequestDto request)
    {
        await _passwordResetService.SolicitarResetAsync(request);
        return Ok(new { mensagem = "Se o e-mail estiver cadastrado, enviaremos instruções de recuperação." });
    }

    /// <summary>Redefine a senha usando o token recebido por e-mail.</summary>
    [HttpPost("redefinir-senha")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RedefinirSenha([FromBody] RedefinirSenhaRequestDto request)
    {
        try
        {
            await _passwordResetService.RedefinirSenhaAsync(request);
            return Ok(new { mensagem = "Senha redefinida com sucesso. Faça login com a nova senha." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
    }
}
