using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Controllers;

[ApiController]
[Route("api/regioes")]
[Authorize]
public class RegioesController : ControllerBase
{
    /// <summary>
    /// Teto de faixas devolvidas: 8 faixas de 3h fecham as 24h que o painel mostra.
    /// A retenção guarda mais que isso, mas mandar tudo só engordaria o payload.
    /// </summary>
    private const int MaxFaixasPrevisao = 8;

    private readonly IRegiaoRepository _regiaoRepository;
    private readonly IPrevisaoService _previsaoService;

    public RegioesController(IRegiaoRepository regiaoRepository, IPrevisaoService previsaoService)
    {
        _regiaoRepository = regiaoRepository;
        _previsaoService = previsaoService;
    }

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

    /// <summary>
    /// Faixas de 3h previstas para a região, em UTC e ordenadas da mais próxima para a mais
    /// distante, agregadas por pior caso entre as subprefeituras.
    /// </summary>
    /// <remarks>
    /// Rota separada de <c>GET /api/regioes</c> de propósito: aquela é consumida pelo
    /// AlertasProvider em toda página do app e recarrega sozinha, então oito faixas por
    /// região ali engordariam um payload global para servir uma tela só.
    /// <para>
    /// Lista vazia é resposta legítima, e não erro: significa que ainda não houve coleta,
    /// ou que a previsão retida já passou. Quem consome renderiza nada nesse caso.
    /// </para>
    /// </remarks>
    [HttpGet("{id:guid}/previsao")]
    [ProducesResponseType(typeof(IReadOnlyList<FaixaPrevisaoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObterPrevisao(Guid id, CancellationToken ct)
    {
        // Só a existência da região importa aqui, então basta o Find: as subprefeituras e
        // os scores que o ObterComDetalheAsync carregaria não entram nesta resposta.
        var regiao = await _regiaoRepository.ObterPorIdAsync(id);
        if (regiao is null)
            return NotFound(new { mensagem = "Região não encontrada." });

        return Ok(await _previsaoService.ObterFaixasRegiaoAsync(id, MaxFaixasPrevisao, ct));
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
            TemperaturaAtual = ultimaLeitura?.TemperaturaC ?? 0.0,
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
                TemperaturaC = ultimaLeitura.TemperaturaC,
                SensacaoTermica = ultimaLeitura.SensacaoTermica,
                Umidade = ultimaLeitura.Umidade,
                Timestamp = ultimaLeitura.Timestamp
            }
        };
    }
}
