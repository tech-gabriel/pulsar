using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/celulas")]
[Authorize]
public class CelulasController : ControllerBase
{
    // A conta muda a cada ciclo de 15 min; um minuto de memória cobre muita gente abrindo o
    // mapa na mesma chuva sem refazer a conta da cidade inteira a cada pedido.
    private static readonly TimeSpan Validade = TimeSpan.FromSeconds(60);

    /// <summary>Risco de alagamento atual de cada trecho da grade, com a estação que mandou na conta.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(CelulasAgoraDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Obter(
        [FromServices] IRiscoCelulasService riscoCelulas, [FromServices] IMemoryCache cache, CancellationToken ct = default)
    {
        // Duas visões em cache: a do Admin traz também a cidade escondida (Baixada em conferência).
        var admin = User.IsInRole("ADMIN");
        return Ok(await cache.GetOrCreateAsync(admin ? "celulas-agora-admin" : "celulas-agora", async entrada =>
        {
            entrada.AbsoluteExpirationRelativeToNow = Validade;
            return await riscoCelulas.AgoraAsync(admin, ct);
        }));
    }
}
