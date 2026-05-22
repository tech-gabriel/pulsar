using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/subprefeituras")]
[Authorize]
public class HistoricoController : ControllerBase
{
    private readonly ISubprefeituraRepository _subprefeituraRepository;
    private readonly ILeituraRepository _leituraRepository;
    private readonly IScoreRepository _scoreRepository;

    public HistoricoController(
        ISubprefeituraRepository subprefeituraRepository,
        ILeituraRepository leituraRepository,
        IScoreRepository scoreRepository)
    {
        _subprefeituraRepository = subprefeituraRepository;
        _leituraRepository = leituraRepository;
        _scoreRepository = scoreRepository;
    }

    /// <summary>Retorna o histórico climático de uma subprefeitura nas últimas N horas.</summary>
    [HttpGet("{id:guid}/historico")]
    [ProducesResponseType(typeof(HistoricoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ObterHistorico(Guid id, [FromQuery] int horas = 24)
    {
        if (horas < 1 || horas > 24)
            return BadRequest(new { mensagem = "O parâmetro 'horas' deve estar entre 1 e 24." });

        var subprefeitura = await _subprefeituraRepository.ObterPorIdAsync(id);
        if (subprefeitura is null || !subprefeitura.Ativa)
            return NotFound(new { mensagem = "Subprefeitura não encontrada." });

        var leituras = (await _leituraRepository.ObterHistoricoAsync(id, horas)).ToList();

        if (leituras.Count < 2)
            return Ok(new HistoricoDto
            {
                SubprefeituraNome = subprefeitura.Nome,
                Leituras = new List<LeituraComScoreDto>()
            });

        var scores = (await _scoreRepository.ObterHistoricoAsync(id, horas))
            .ToDictionary(s => s.LeituraId);

        var leiturasDtos = leituras.Select(l =>
        {
            scores.TryGetValue(l.Id, out var score);
            return new LeituraComScoreDto
            {
                ChuvaMmH = l.ChuvaMmH,
                VentoKmH = l.VentoKmH,
                VisibilidadeKm = l.VisibilidadeKm,
                IndiceUv = l.IndiceUv,
                Timestamp = l.Timestamp,
                Score = score is null ? null : new ScoreDto
                {
                    Valor = Math.Round(score.Valor, 1),
                    Faixa = score.Faixa,
                    Timestamp = score.Timestamp
                }
            };
        }).ToList();

        return Ok(new HistoricoDto
        {
            SubprefeituraNome = subprefeitura.Nome,
            Leituras = leiturasDtos
        });
    }
}
