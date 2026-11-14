using Pulsar.API.Domain.Chuva;
using Pulsar.API.Domain.Score;
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
    private readonly IGradeCelulas _grade;
    private readonly ICemadenService _cemaden;
    private readonly ILogger<RotaService> _logger;

    public RotaService(ISubprefeituraRepository subprefeituraRepo, IPontoAlagamentoCgeRepository pontosCge,
        IChuvaReferenciaClient chuva, IMemoryCache cache, IGradeCelulas grade, ICemadenService cemaden, ILogger<RotaService> logger)
    {
        _grade = grade;
        _cemaden = cemaden;
        _subprefeituraRepo = subprefeituraRepo;
        _pontosCge = pontosCge;
        _chuva = chuva;
        _cache = cache;
        _logger = logger;
    }

    public async Task<RotaAvaliacaoDto> AvaliarAsync(IReadOnlyList<Guid> ids, CaminhoRota? caminho = null, CancellationToken ct = default)
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

        var trechosDoCaminho = TrechosDoCaminho(caminho);
        var estacoes = trechosDoCaminho.Count > 0 ? await EstacoesAsync(agora, ct) : [];

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
                ? (FaixaRisco)Math.Max(
                    (int)AlagamentoNoCaminho(score!, sub.Nome, trechosDoCaminho.GetValueOrDefault(sub.Nome), estacoes),
                    (int)score!.Componentes.Vento.Faixa)
                : null;

            return new TrechoEntrada(id, sub.Nome, faixa, comCge.Contains(id), proximas);
        }).ToList();

        var r = AvaliadorRota.Avaliar(trechos, agora);
        return new RotaAvaliacaoDto(r.Estado, r.TrechoDecisivoId, r.TranquiloAteUtc, r.EsperarAteUtc,
            [.. trechos.Select(t => new TrechoRotaDto(t.SubprefeituraId, t.Nome, t.FaixaAgora, t.AlagandoCge))],
            [.. r.Horas.Select(h => new HoraRotaDto(h.InicioUtc, h.PiorFaixa))]);
    }

    /// <summary>
    /// Os trechos (hexágonos) por onde a reta passa, por área. Sem caminho (app antigo, pedido
    /// antigo) ou com a grade fora do ar, vazio: a rota responde pela área inteira, como antes.
    /// </summary>
    private Dictionary<string, List<CelulaGrade>> TrechosDoCaminho(CaminhoRota? caminho)
    {
        if (caminho is null) return [];
        try
        {
            return caminho.Pontos()
                .Select(p => _grade.MaisProxima(p.Lat, p.Lon))
                .OfType<CelulaGrade>()
                .DistinctBy(c => c.H3)
                .GroupBy(c => c.Sub)
                .ToDictionary(g => g.Key, g => g.ToList());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao ler os trechos do caminho; a rota segue pela área.");
            return [];
        }
    }

    /// <summary>A chuva medida é complemento: sem ela, a rota responde pela área.</summary>
    private async Task<IReadOnlyList<EstacaoChuva>> EstacoesAsync(DateTime agora, CancellationToken ct)
    {
        try
        {
            return await _cemaden.ObterEstacoesComChuvaAsync(agora, ct);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Falha ao ler as estações com chuva medida; a rota segue pela área.");
            return [];
        }
    }

    /// <summary>
    /// O alagamento de uma área, visto do caminho: o pior entre os trechos por onde ele passa.
    /// Trecho com estação válida por perto vale a chuva medida (a medida manda), com o histórico
    /// de alagamento do trecho no fator. Trecho sem estação vale o que a área diz: parte do
    /// caminho sem medição não pode ser dada como tranquila.
    /// </summary>
    private static FaixaRisco AlagamentoNoCaminho(ScoreDto score, string nome, List<CelulaGrade>? trechos,
        IReadOnlyList<EstacaoChuva> estacoes)
    {
        var daArea = score.Componentes.Alagamento.Faixa;
        if (trechos is null || estacoes.Count == 0) return daArea;

        // A chuva de 1 h e 3 h vem da estação; do modelo só entram as 48 h, quando a estação não as manda.
        var modelo = new EntradaScore(0, 0, score.Chuva48hMm, 0, 0, nome);
        return trechos.Max(t => EstacaoChuva.MaisProxima(t.Lat, t.Lon, estacoes, RiscoTrecho.RaioEstacaoKm) is { } estacao
            ? RiscoTrecho.ComChuvaMedida(modelo, estacao, t.Fator).Faixa
            : daArea);
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
        // Uma chamada lenta que falha depois de outra ter acertado não pode apagar a série boa do cache.
        if (!_cache.TryGetValue(ChaveCacheChuva, out _))
            _cache.Set(ChaveCacheChuva, (Dictionary<Guid, IReadOnlyDictionary<DateTime, double>>?)null, LimiaresRota.CacheFalha);
        return null;
    }
}
