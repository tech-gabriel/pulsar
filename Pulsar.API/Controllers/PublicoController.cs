using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Notificacoes;

namespace Pulsar.API.Controllers;

/// <summary>
/// Dados ao vivo das páginas públicas (sem login), como "Pontos de alagamento em SP hoje".
/// </summary>
[ApiController]
[Route("api/publico")]
[AllowAnonymous]
public class PublicoController : ControllerBase
{
    private const string ChaveCache = "publico-risco-agora";
    // A coleta é de 15 em 15 min e a página relê a cada 5: 5 min de cache não atrasa o risco.
    private static readonly TimeSpan DuracaoCache = TimeSpan.FromMinutes(5);

    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly IPontoAlagamentoCgeRepository _pontosCge;
    private readonly IMemoryCache _cache;

    public PublicoController(ISubprefeituraRepository subprefeituraRepo, IPontoAlagamentoCgeRepository pontosCge, IMemoryCache cache)
    {
        _subprefeituraRepo = subprefeituraRepo;
        _pontosCge = pontosCge;
        _cache = cache;
    }

    /// <summary>
    /// Risco atual e alagamentos ativos do CGE de cada subprefeitura, por nome. Público, então
    /// protegido em duas camadas: cache (chamada em loop não chega ao banco) e rate limit por IP.
    /// </summary>
    [HttpGet("risco-agora")]
    [EnableRateLimiting("publico")]
    [ProducesResponseType(typeof(IEnumerable<RiscoAgoraPublicoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> RiscoAgora()
    {
        var resultado = await _cache.GetOrCreateAsync(ChaveCache, async entrada =>
        {
            entrada.AbsoluteExpirationRelativeToNow = DuracaoCache;
            var subs = await _subprefeituraRepo.ObterAtivasComResumoAsync();
            // Mesma validade do mapa e do push: ponto que o app não mostraria não aparece aqui.
            var pontos = (await _pontosCge.ObterAtivosAsync(DateTime.UtcNow - LimiaresNotificacao.ValidadePontoCge))
                .ToLookup(p => p.SubprefeituraId);
            return subs
                .Select(s =>
                {
                    var resumo = SubprefeituraDto.Preencher(new SubprefeituraDto(), s);
                    return new RiscoAgoraPublicoDto
                    {
                        Nome = resumo.Nome,
                        FaixaRisco = resumo.FaixaRisco,
                        Score = resumo.ScoreAtual?.Valor,
                        AtualizadoEmUtc = resumo.ScoreAtual is null ? null : DateTime.SpecifyKind(resumo.ScoreAtual.Timestamp, DateTimeKind.Utc),
                        PerigoPrincipal = resumo.ScoreAtual?.PerigoPrincipal,
                        Chuva3hMm = resumo.ScoreAtual?.Chuva3hMm,
                        VentoKmH = resumo.UltimaLeitura?.VentoKmH,
                        SensacaoTermica = resumo.UltimaLeitura?.SensacaoTermica,
                        AlagamentosCge = [.. pontos[s.Id].Select(PontoAlagamentoCgeDto.De)],
                    };
                })
                .OrderBy(d => d.Nome, StringComparer.Ordinal)
                .ToList();
        });
        return Ok(resultado);
    }
}
