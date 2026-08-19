using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "ADMIN,SUPORTE")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ISistemaService _sistemaService;
    private readonly IOcorrenciaIngestionService _ingestionService;
    private readonly IAgregadoDiarioRepository _agregadoRepo;
    private readonly IMotorNotificacoes _motor;

    public AdminController(
        IAdminService adminService,
        ISistemaService sistemaService,
        IOcorrenciaIngestionService ingestionService,
        IAgregadoDiarioRepository agregadoRepo,
        IMotorNotificacoes motor)
    {
        _adminService = adminService;
        _sistemaService = sistemaService;
        _ingestionService = ingestionService;
        _agregadoRepo = agregadoRepo;
        _motor = motor;
    }

    /// <summary>Agregados diários recentes. Serve para conferir que a série está acumulando.</summary>
    [HttpGet("agregados")]
    [ProducesResponseType(typeof(IReadOnlyList<AgregadoDiarioDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ObterAgregados([FromQuery] int dias = 7)
    {
        var limitado = Math.Clamp(dias, 1, 90);
        var linhas = await _agregadoRepo.ObterRecentesAsync(limitado);

        return Ok(linhas.Select(a => new AgregadoDiarioDto
        {
            Dia = a.Dia,
            Subprefeitura = a.Subprefeitura.Nome,
            Regiao = a.Subprefeitura.Regiao.Nome,
            FusoHorario = a.FusoHorario,
            ChuvaTotalMm = Math.Round(a.ChuvaTotalMm, 1),
            ScoreMedio = Math.Round(a.ScoreMedio, 1),
            ScoreMax = Math.Round(a.ScoreMax, 1),
            LeiturasAlto = a.LeiturasAlto,
            LeiturasCount = a.LeiturasCount,
        }).ToList());
    }

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

    /// <summary>Exclui permanentemente a conta de um usuário. Apenas ADMIN. Não permite excluir a si mesmo nem outro administrador.</summary>
    [HttpDelete("usuarios/{id:guid}")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExcluirUsuario(Guid id)
    {
        try
        {
            await _adminService.ExcluirUsuarioAsync(UsuarioAtualId(), id);
            return NoContent();
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

    // ── Catálogo de Sugestões ──────────────────────────────────

    /// <summary>Lista todas as sugestões do catálogo (inclui inativas). ADMIN e SUPORTE.</summary>
    [HttpGet("sugestoes")]
    [ProducesResponseType(typeof(IReadOnlyList<SugestaoAdminDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListarSugestoes()
        => Ok(await _adminService.ListarSugestoesAsync());

    /// <summary>Cria uma nova sugestão. Apenas ADMIN.</summary>
    [HttpPost("sugestoes")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(typeof(SugestaoAdminDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CriarSugestao([FromBody] SalvarSugestaoRequestDto request)
    {
        try
        {
            var criada = await _adminService.CriarSugestaoAsync(request);
            return StatusCode(StatusCodes.Status201Created, criada);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
    }

    /// <summary>Atualiza uma sugestão existente. Apenas ADMIN.</summary>
    [HttpPut("sugestoes/{id:guid}")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(typeof(SugestaoAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AtualizarSugestao(Guid id, [FromBody] SalvarSugestaoRequestDto request)
    {
        try
        {
            var atualizada = await _adminService.AtualizarSugestaoAsync(id, request);
            return Ok(atualizada);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensagem = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensagem = ex.Message });
        }
    }

    /// <summary>Exclui uma sugestão. Apenas ADMIN. Retorna 409 se vinculada a alertas.</summary>
    [HttpDelete("sugestoes/{id:guid}")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoverSugestao(Guid id)
    {
        try
        {
            await _adminService.RemoverSugestaoAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { mensagem = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensagem = ex.Message });
        }
    }

    // ── Painel de sistema + métricas ───────────────────────────

    /// <summary>Status da coleta de dados climáticos. ADMIN e SUPORTE.</summary>
    [HttpGet("sistema/status")]
    [ProducesResponseType(typeof(SistemaStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ObterStatus()
        => Ok(await _sistemaService.ObterStatusAsync());

    /// <summary>Métricas agregadas do sistema. ADMIN e SUPORTE.</summary>
    [HttpGet("metricas")]
    [ProducesResponseType(typeof(MetricasDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ObterMetricas()
        => Ok(await _sistemaService.ObterMetricasAsync());

    /// <summary>
    /// Dispara uma coleta manual (clima → scores → agregado → previsão → alertas →
    /// notificações). Apenas ADMIN. Atenção: a última etapa pode mandar push de verdade.
    /// </summary>
    [HttpPost("sistema/coletar")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(typeof(ColetaResultadoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ForcarColeta(CancellationToken ct)
        => Ok(await _sistemaService.ForcarColetaAsync(ct));

    /// <summary>Sincroniza as ocorrências de alagamento do GeoSampa. Apenas ADMIN.</summary>
    [HttpPost("ocorrencias/sincronizar")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(typeof(OcorrenciaSincronizacaoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> SincronizarOcorrencias(CancellationToken ct)
        => Ok(await _ingestionService.SincronizarAsync(ct));

    /// <summary>
    /// Roda o motor de notificações sob demanda. Existe porque o briefing das 6h locais
    /// não dá para esperar sentado, nem local nem em produção. Apenas ADMIN.
    /// </summary>
    /// <remarks>
    /// ADMIN e não ADMIN,SUPORTE como o resto do controller: isto MANDA PUSH para usuários
    /// reais, então acompanha a coleta manual e o sync do GeoSampa, e não a leitura do
    /// painel. O campo devolvido é a soma que o motor apurou, que pode subestimar (ver o
    /// doc de IMotorNotificacoes).
    /// </remarks>
    [HttpPost("notificacoes/avaliar")]
    [Authorize(Roles = "ADMIN")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> AvaliarNotificacoes(CancellationToken ct)
    {
        var enviados = await _motor.AvaliarEDispararAsync(ct);
        return Ok(new { enviados });
    }

    private Guid UsuarioAtualId()
    {
        var subClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subClaim, out var id) ? id : Guid.Empty;
    }
}
