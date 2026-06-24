using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/notificacoes")]
[Authorize]
public class NotificacoesController : ControllerBase
{
    private readonly IAssinaturaPushRepository _assinaturaRepo;
    private readonly IPushNotificationService _push;

    public NotificacoesController(
        IAssinaturaPushRepository assinaturaRepo,
        IPushNotificationService push)
    {
        _assinaturaRepo = assinaturaRepo;
        _push = push;
    }

    /// <summary>Chave pública VAPID e se o push está habilitado no servidor.</summary>
    [HttpGet("vapid-public-key")]
    [ProducesResponseType(typeof(VapidPublicKeyDto), StatusCodes.Status200OK)]
    public IActionResult ObterChavePublica()
        => Ok(new VapidPublicKeyDto
        {
            Habilitado = _push.Habilitado,
            ChavePublica = _push.ChavePublica
        });

    /// <summary>Registra (ou atualiza) a inscrição de push deste navegador para o usuário.</summary>
    [HttpPost("subscriptions")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Inscrever([FromBody] AssinaturaPushRequestDto request)
    {
        if (!_push.Habilitado)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { mensagem = "Notificações push não estão habilitadas no servidor." });

        if (!TryObterUsuarioId(out var usuarioId))
            return Forbid();

        // Upsert pela chave natural (endpoint): se o navegador já está inscrito,
        // atualiza dono e preferências; senão cria uma nova inscrição.
        var existente = await _assinaturaRepo.ObterPorEndpointAsync(request.Endpoint);
        if (existente is null)
        {
            await _assinaturaRepo.AdicionarAsync(new AssinaturaPush
            {
                UsuarioId = usuarioId,
                Endpoint = request.Endpoint,
                P256dh = request.P256dh,
                Auth = request.Auth,
                AlertaModerado = request.AlertaModerado,
                AlertaAlto = request.AlertaAlto,
                ResumoDiario = request.ResumoDiario
            });
        }
        else
        {
            existente.UsuarioId = usuarioId;
            existente.P256dh = request.P256dh;
            existente.Auth = request.Auth;
            existente.AlertaModerado = request.AlertaModerado;
            existente.AlertaAlto = request.AlertaAlto;
            existente.ResumoDiario = request.ResumoDiario;
            await _assinaturaRepo.AtualizarAsync(existente);
        }

        try
        {
            await _assinaturaRepo.SalvarAsync();
        }
        catch (DbUpdateException)
        {
            // Corrida: outra requisição concorrente inscreveu o mesmo endpoint
            // (índice único). O resultado desejado já está persistido — idempotente.
        }

        return NoContent();
    }

    /// <summary>Cancela a inscrição de push deste navegador (pelo endpoint).</summary>
    [HttpDelete("subscriptions")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Cancelar([FromQuery] string endpoint)
    {
        if (string.IsNullOrWhiteSpace(endpoint))
            return NoContent();

        if (!TryObterUsuarioId(out var usuarioId))
            return Forbid();

        var assinatura = await _assinaturaRepo.ObterPorEndpointAsync(endpoint);
        // Só remove se for do próprio usuário; caso contrário, no-op silencioso.
        if (assinatura is not null && assinatura.UsuarioId == usuarioId)
        {
            await _assinaturaRepo.RemoverAsync(assinatura);
            await _assinaturaRepo.SalvarAsync();
        }

        return NoContent();
    }

    private bool TryObterUsuarioId(out Guid usuarioId)
    {
        var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subClaim, out usuarioId);
    }
}
