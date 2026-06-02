using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/noticias")]
[Authorize]
public class NoticiasController : ControllerBase
{
    private readonly INoticiaService _noticiaService;
    private readonly ILogger<NoticiasController> _logger;

    public NoticiasController(INoticiaService noticiaService, ILogger<NoticiasController> logger)
    {
        _noticiaService = noticiaService;
        _logger = logger;
    }

    /// <summary>Retorna as notícias climáticas mais recentes do CGE-SP.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<NoticiaDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> ObterTodas(CancellationToken ct)
    {
        try
        {
            var noticias = await _noticiaService.ObterNoticiasAsync(ct);
            return Ok(noticias);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao obter notícias da fonte externa.");
            return StatusCode(StatusCodes.Status502BadGateway,
                new { mensagem = "Não foi possível obter as notícias no momento." });
        }
    }
}
