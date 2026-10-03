using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Notificacoes;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/usuarios/{usuarioId:guid}/favoritos")]
[Authorize]
public class FavoritosController : ControllerBase
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly ISubprefeituraRepository _subprefeituraRepository;

    public FavoritosController(
        IUsuarioRepository usuarioRepository,
        ISubprefeituraRepository subprefeituraRepository)
    {
        _usuarioRepository = usuarioRepository;
        _subprefeituraRepository = subprefeituraRepository;
    }

    /// <summary>Retorna as subprefeituras que o usuário acompanha.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<FavoritoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObterFavoritos(Guid usuarioId)
    {
        if (!UsuarioAutorizado(usuarioId))
            return Forbid();

        var usuario = await _usuarioRepository.ObterComFavoritosAsync(usuarioId);
        if (usuario is null)
            return NotFound(new { mensagem = "Usuário não encontrado." });

        return Ok(usuario.Favoritos.Select(f => ParaDto(f.Subprefeitura)));
    }

    /// <summary>Passa a acompanhar uma subprefeitura (até o limite por pessoa).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(FavoritoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AdicionarFavorito(
        Guid usuarioId,
        [FromBody] AdicionarFavoritoRequestDto request)
    {
        if (!UsuarioAutorizado(usuarioId))
            return Forbid();

        var usuario = await _usuarioRepository.ObterComFavoritosAsync(usuarioId);
        if (usuario is null)
            return NotFound(new { mensagem = "Usuário não encontrado." });

        var sub = await _subprefeituraRepository.ObterComRegiaoAsync(request.SubprefeituraId);
        if (sub is null)
            return NotFound(new { mensagem = "Subprefeitura não encontrada." });

        if (usuario.Favoritos.Any(f => f.SubprefeituraId == request.SubprefeituraId))
            return Conflict(new { mensagem = "Subprefeitura já está nos favoritos." });

        if (usuario.Favoritos.Count >= LimiaresNotificacao.MaxFavoritasPorUsuario)
            return BadRequest(new { mensagem = $"Você já acompanha {LimiaresNotificacao.MaxFavoritasPorUsuario} subprefeituras. Remova uma para adicionar outra." });

        await _usuarioRepository.AdicionarFavoritoAsync(new UsuarioSubprefeitura
        {
            UsuarioId = usuarioId,
            SubprefeituraId = request.SubprefeituraId,
        });
        await _usuarioRepository.SalvarAsync();

        return StatusCode(StatusCodes.Status201Created, ParaDto(sub));
    }

    /// <summary>Deixa de acompanhar uma subprefeitura.</summary>
    [HttpDelete("{subprefeituraId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoverFavorito(Guid usuarioId, Guid subprefeituraId)
    {
        if (!UsuarioAutorizado(usuarioId))
            return Forbid();

        var usuario = await _usuarioRepository.ObterComFavoritosAsync(usuarioId);
        if (usuario is null)
            return NotFound(new { mensagem = "Usuário não encontrado." });

        var favorito = usuario.Favoritos.FirstOrDefault(f => f.SubprefeituraId == subprefeituraId);
        if (favorito is null)
            return NotFound(new { mensagem = "Favorito não encontrado." });

        usuario.Favoritos.Remove(favorito);
        await _usuarioRepository.SalvarAsync();

        return NoContent();
    }

    private static FavoritoDto ParaDto(Subprefeitura s) => new()
    {
        SubprefeituraId = s.Id,
        Nome = s.Nome,
        RegiaoId = s.RegiaoId,
        RegiaoNome = s.Regiao.Nome,
    };

    private bool UsuarioAutorizado(Guid usuarioId)
    {
        var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subClaim, out var tokenUserId) && tokenUserId == usuarioId;
    }
}
