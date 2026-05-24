using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/usuarios/{usuarioId:guid}/favoritos")]
[Authorize]
public class FavoritosController : ControllerBase
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly IRegiaoRepository _regiaoRepository;

    public FavoritosController(
        IUsuarioRepository usuarioRepository,
        IRegiaoRepository regiaoRepository)
    {
        _usuarioRepository = usuarioRepository;
        _regiaoRepository = regiaoRepository;
    }

    /// <summary>Retorna as regiões favoritas do usuário.</summary>
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

        var dtos = usuario.Favoritos.Select(f => new FavoritoDto
        {
            RegiaoId = f.RegiaoId,
            RegiaoNome = f.Regiao.Nome
        });

        return Ok(dtos);
    }

    /// <summary>Adiciona uma região aos favoritos do usuário.</summary>
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

        var regiao = await _regiaoRepository.ObterPorIdAsync(request.RegiaoId);
        if (regiao is null)
            return NotFound(new { mensagem = "Região não encontrada." });

        if (usuario.Favoritos.Any(f => f.RegiaoId == request.RegiaoId))
            return Conflict(new { mensagem = "Região já está nos favoritos." });

        var favorito = new UsuarioRegiao
        {
            UsuarioId = usuarioId,
            RegiaoId = request.RegiaoId
        };

        usuario.Favoritos.Add(favorito);
        await _usuarioRepository.SalvarAsync();

        var dto = new FavoritoDto { RegiaoId = regiao.Id, RegiaoNome = regiao.Nome };
        return StatusCode(StatusCodes.Status201Created, dto);
    }

    /// <summary>Remove uma região dos favoritos do usuário.</summary>
    [HttpDelete("{regiaoId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoverFavorito(Guid usuarioId, Guid regiaoId)
    {
        if (!UsuarioAutorizado(usuarioId))
            return Forbid();

        var usuario = await _usuarioRepository.ObterComFavoritosAsync(usuarioId);
        if (usuario is null)
            return NotFound(new { mensagem = "Usuário não encontrado." });

        var favorito = usuario.Favoritos.FirstOrDefault(f => f.RegiaoId == regiaoId);
        if (favorito is null)
            return NotFound(new { mensagem = "Favorito não encontrado." });

        usuario.Favoritos.Remove(favorito);
        await _usuarioRepository.SalvarAsync();

        return NoContent();
    }

    private bool UsuarioAutorizado(Guid usuarioId)
    {
        var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subClaim, out var tokenUserId) && tokenUserId == usuarioId;
    }
}
