using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/regioes")]
[Authorize]
public class RegioesController : ControllerBase
{
    private readonly IRegiaoRepository _regiaoRepository;

    public RegioesController(IRegiaoRepository regiaoRepository)
        => _regiaoRepository = regiaoRepository;

    /// <summary>Retorna os scores agregados de todas as regiões.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<RegiaoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObterTodas()
    {
        var regioes = await _regiaoRepository.ObterTodasComSubprefeituraEScoreAsync();
        var dtos = regioes.Select(MapearRegiaoDto).OrderByDescending(r => r.ScoreAgregado);
        return Ok(dtos);
    }

    /// <summary>Retorna os detalhes de uma região com suas subprefeituras e scores.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(RegiaoDetalheDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObterPorId(Guid id)
    {
        var regiao = await _regiaoRepository.ObterComDetalheAsync(id);
        if (regiao is null)
            return NotFound(new { mensagem = "Região não encontrada." });

        return Ok(MapearRegiaoDetalheDto(regiao));
    }

    private static RegiaoDto MapearRegiaoDto(Regiao regiao)
    {
        var scoreAgregado = regiao.GetScoreAgregado();
        var ultimaAtualizacao = regiao.Subprefeituras
            .SelectMany(s => s.Scores)
            .MaxBy(sc => sc.Timestamp)?.Timestamp ?? regiao.AtualizadoEm;

        return new RegiaoDto
        {
            Id = regiao.Id,
            Nome = regiao.Nome,
            ScoreAgregado = Math.Round(scoreAgregado, 1),
            FaixaRisco = regiao.GetFaixaAgregada(),
            TotalSubprefeituras = regiao.Subprefeituras.Count(s => s.Ativa),
            UltimaAtualizacao = ultimaAtualizacao
        };
    }

    private static RegiaoDetalheDto MapearRegiaoDetalheDto(Regiao regiao)
    {
        var regiaoDto = MapearRegiaoDto(regiao);

        return new RegiaoDetalheDto
        {
            Id = regiaoDto.Id,
            Nome = regiaoDto.Nome,
            ScoreAgregado = regiaoDto.ScoreAgregado,
            FaixaRisco = regiaoDto.FaixaRisco,
            TotalSubprefeituras = regiaoDto.TotalSubprefeituras,
            UltimaAtualizacao = regiaoDto.UltimaAtualizacao,
            Subprefeituras = regiao.Subprefeituras
                .Where(s => s.Ativa)
                .OrderByDescending(s => s.GetUltimoScore()?.Valor ?? 0)
                .Select(MapearSubprefeituraDto)
                .ToList()
        };
    }

    private static SubprefeituraDto MapearSubprefeituraDto(Subprefeitura sub)
    {
        var ultimoScore = sub.GetUltimoScore();
        var ultimaLeitura = sub.GetUltimaLeitura();

        return new SubprefeituraDto
        {
            Id = sub.Id,
            Nome = sub.Nome,
            Latitude = sub.Latitude,
            Longitude = sub.Longitude,
            FaixaRisco = ultimoScore?.Faixa ?? FaixaRisco.BAIXO,
            ScoreAtual = ultimoScore is null ? null : new ScoreDto
            {
                Valor = Math.Round(ultimoScore.Valor, 1),
                Faixa = ultimoScore.Faixa,
                Timestamp = ultimoScore.Timestamp
            },
            UltimaLeitura = ultimaLeitura is null ? null : new LeituraDto
            {
                ChuvaMmH = ultimaLeitura.ChuvaMmH,
                VentoKmH = ultimaLeitura.VentoKmH,
                VisibilidadeKm = ultimaLeitura.VisibilidadeKm,
                IndiceUv = ultimaLeitura.IndiceUv,
                Timestamp = ultimaLeitura.Timestamp
            }
        };
    }
}
