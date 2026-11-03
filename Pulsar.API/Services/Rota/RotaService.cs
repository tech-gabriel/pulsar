using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;

namespace Pulsar.API.Services.Rota;

/// <summary>Monta as entradas do <see cref="AvaliadorRota"/> a partir do banco e do Open-Meteo.</summary>
public class RotaService : IRotaService
{
    private const string ChaveCacheChuva = "rota-chuva-horaria";
    // A previsão do Open-Meteo muda de hora em hora; 15 min é o ciclo da coleta.
    private static readonly TimeSpan DuracaoCache = TimeSpan.FromMinutes(15);

    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly IPontoAlagamentoCgeRepository _pontosCge;
    private readonly IChuvaReferenciaClient _chuva;
    private readonly IMemoryCache _cache;
    private readonly ILogger<RotaService> _logger;

    public RotaService(ISubprefeituraRepository subprefeituraRepo, IPontoAlagamentoCgeRepository pontosCge,
        IChuvaReferenciaClient chuva, IMemoryCache cache, ILogger<RotaService> logger)
    {
        _subprefeituraRepo = subprefeituraRepo;
        _pontosCge = pontosCge;
        _chuva = chuva;
        _cache = cache;
        _logger = logger;
    }

    public async Task<RotaAvaliacaoDto> AvaliarAsync(IReadOnlyList<Guid> ids, CancellationToken ct = default)
    {
        if (ids.Distinct().Count() != ids.Count)
            throw new ArgumentException("Há subprefeituras repetidas no caminho.");

        var agora = DateTime.UtcNow;
        var ativas = (await _subprefeituraRepo.ObterAtivasComResumoAsync()).ToDictionary(s => s.Id);
        if (ids.Any(id => !ativas.ContainsKey(id)))
            throw new ArgumentException("Subprefeitura desconhecida no caminho.");

        var comCge = (await _pontosCge.ObterAtivosAsync(agora - LimiaresNotificacao.ValidadePontoCge))
            .Select(p => p.SubprefeituraId).ToHashSet();
        var series = await ObterSeriesAsync(ativas.Values.ToList(), ct);
        var horaAtual = new DateTime(agora.Year, agora.Month, agora.Day, agora.Hour, 0, 0, DateTimeKind.Utc);
        var limite = horaAtual.AddHours(LimiaresRota.HorizonteEsperaHoras);

        var trechos = ids.Select(id =>
        {
            var sub = ativas[id];
            var score = SubprefeituraDto.Preencher(new SubprefeituraDto(), sub).ScoreAtual;
            // Score velho não vale como "agora": melhor admitir que não sabemos.
            var recente = score is not null
                && agora - DateTime.SpecifyKind(score.Timestamp, DateTimeKind.Utc) <= TimeSpan.FromMinutes(LimiaresRota.ScoreVelhoMinutos);

            IReadOnlyList<HoraPrevista> proximas = [];
            if (series?.GetValueOrDefault(id) is { } serie)
                proximas = [.. serie.Keys.Where(h => h > agora && h <= limite).OrderBy(h => h)
                    .Select(h => new HoraPrevista(h, AvaliadorRota.FaixaPrevista(serie, h, score?.Chuva48hMm ?? 0, sub.Nome)))];

            // Rota a pé ou de carro só se importa com alagamento e vento; calor não decide o caminho.
            FaixaRisco? faixa = recente
                ? (FaixaRisco)Math.Max((int)score!.Componentes.Alagamento.Faixa, (int)score.Componentes.Vento.Faixa)
                : null;

            return new TrechoEntrada(id, sub.Nome, faixa, comCge.Contains(id), proximas);
        }).ToList();

        var r = AvaliadorRota.Avaliar(trechos, agora);
        return new RotaAvaliacaoDto(r.Estado, r.TrechoDecisivoId, r.TranquiloAteUtc, r.EsperarAteUtc,
            [.. trechos.Select(t => new TrechoRotaDto(t.SubprefeituraId, t.Nome, t.FaixaAgora, t.AlagandoCge))],
            [.. r.Horas.Select(h => new HoraRotaDto(h.InicioUtc, h.PiorFaixa))]);
    }

    /// <summary>
    /// Uma chamada só para todas as ativas, em cache. Qualquer falha (inclusive timeout) vira null
    /// (sem previsão) e também fica em cache por pouco tempo; só o cancelamento do próprio pedido propaga.
    /// </summary>
    private async Task<Dictionary<Guid, IReadOnlyDictionary<DateTime, double>>?> ObterSeriesAsync(
        IReadOnlyList<Subprefeitura> subs, CancellationToken ct)
    {
        if (_cache.TryGetValue(ChaveCacheChuva, out Dictionary<Guid, IReadOnlyDictionary<DateTime, double>>? emCache))
            return emCache;
        try
        {
            using var limite = CancellationTokenSource.CreateLinkedTokenSource(ct);
            limite.CancelAfter(LimiaresRota.TimeoutPrevisao);
            var series = await _chuva.ObterHorariaAsync([.. subs.Select(s => (s.Latitude, s.Longitude))], limite.Token);
            if (series is not null && series.Count == subs.Count)
            {
                var porId = subs.Select((s, i) => (s.Id, series[i])).ToDictionary(x => x.Id, x => x.Item2);
                // ponytail: sem trava contra duas chamadas simultâneas no cache frio; uma chamada extra é aceitável.
                return _cache.Set(ChaveCacheChuva, porId, DuracaoCache);
            }
            _logger.LogWarning("Open-Meteo devolveu {Recebidas} séries para {Esperadas} subprefeituras: rota sem previsão por hora.",
                series?.Count ?? 0, subs.Count);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Open-Meteo indisponível: a rota segue sem previsão por hora.");
        }
        _cache.Set(ChaveCacheChuva, (Dictionary<Guid, IReadOnlyDictionary<DateTime, double>>?)null, LimiaresRota.CacheFalha);
        return null;
    }
}
