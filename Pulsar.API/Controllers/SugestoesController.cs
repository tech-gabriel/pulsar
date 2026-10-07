using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/sugestoes")]
[Authorize]
public class SugestoesController : ControllerBase
{
    private readonly ISugestaoRepository _repo;

    public SugestoesController(ISugestaoRepository repo) => _repo = repo;

    /// <summary>Catálogo de dicas ativas por perigo e faixa. Pequeno: o app busca uma vez por sessão.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SugestaoPublicaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar()
        => Ok((await _repo.ListarAtivasAsync()).Select(s => new SugestaoPublicaDto
        {
            Id = s.Id,
            Categoria = s.Categoria,
            Faixa = s.FaixaRisco,
            Titulo = s.Titulo,
            Descricao = s.Descricao,
            Ordem = s.Ordem,
        }));
}
