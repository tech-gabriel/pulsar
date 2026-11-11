using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Traz a chuva acumulada das estações do CEMADEN para o banco, uma vez por ciclo, e responde
/// qual estação vale para cada subprefeitura. Uma chamada por município: para cobrir outra
/// cidade basta acrescentar o código do IBGE em Cemaden:Municipios. A tela lê daqui, nunca do
/// CEMADEN: se ele cai, as leituras envelhecem e a região fica sem esse dado sozinha.
/// </summary>
public class CemadenService : ICemadenService
{
    /// <summary>Até onde uma estação ainda fala pela subprefeitura (distância ao centro). Mesmo teto do vizinho do CGE.</summary>
    public const double RaioKm = 10.0;

    /// <summary>
    /// Leitura mais velha que isto não é mostrada como atual. Folgado de propósito: a estação
    /// manda dado de hora em hora quando está seco.
    /// </summary>
    public const int ValidadeMinutos = 90;

    /// <summary>O relógio do CEMADEN pode estar um pouco à frente do nosso.</summary>
    private const int FolgaRelogioMinutos = 15;

    private static readonly TimeSpan ValidadeCadastro = TimeSpan.FromHours(24);
    private static readonly string[] MunicipiosPadrao = ["3550308"];

    private readonly PulsarDbContext _db;
    private readonly ICemadenClient _client;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CemadenService> _logger;

    public CemadenService(PulsarDbContext db, ICemadenClient client, IConfiguration configuration, ILogger<CemadenService> logger)
    {
        _db = db;
        _client = client;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task ColetarAsync(CancellationToken ct = default)
    {
        if (!_client.Configurado)
        {
            _logger.LogWarning("Cemaden:Email ou Cemaden:Senha não configurados: coleta do CEMADEN desligada.");
            return;
        }

        var agora = DateTime.UtcNow;
        var municipios = _configuration.GetSection("Cemaden:Municipios").Get<string[]>() is { Length: > 0 } lista
            ? lista : MunicipiosPadrao;

        foreach (var codIbge in municipios)
        {
            if (ct.IsCancellationRequested) break;

            // Cadastro e leituras falham separados: sem o cadastro novo, o de ontem ainda serve.
            try
            {
                await AtualizarCadastroAsync(codIbge, agora, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Falha ao ler o cadastro das estações do CEMADEN ({Municipio}).", codIbge);
            }

            try
            {
                await GravarLeiturasAsync(codIbge, agora, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Falha ao ler os acumulados do CEMADEN ({Municipio}).", codIbge);
            }
        }
    }

    private async Task AtualizarCadastroAsync(string codIbge, DateTime agora, CancellationToken ct)
    {
        var atuais = await _db.EstacoesCemaden.Where(e => e.CodIbge == codIbge).ToListAsync(ct);
        if (atuais.Count > 0 && atuais.Min(e => e.ConferidoEm) > agora - ValidadeCadastro) return;

        var porCodigo = atuais.ToDictionary(e => e.CodEstacao);
        foreach (var c in await _client.ObterCadastroAsync(codIbge, ct))
        {
            if (!porCodigo.TryGetValue(c.CodEstacao, out var estacao))
            {
                // Estação que mudou de município no cadastro: a chave é o código, não o par.
                estacao = await _db.EstacoesCemaden.FindAsync([c.CodEstacao], ct) ?? _db.EstacoesCemaden.Add(new EstacaoCemaden { CodEstacao = c.CodEstacao }).Entity;
                porCodigo[c.CodEstacao] = estacao;
            }
            estacao.CodIbge = codIbge;
            estacao.Nome = c.Nome.Length > 120 ? c.Nome[..120] : c.Nome;
            estacao.Latitude = c.Latitude;
            estacao.Longitude = c.Longitude;
        }
        // Carimba todas, inclusive as que saíram do cadastro: senão uma estação desativada
        // faria o cadastro ser buscado de novo a cada ciclo.
        foreach (var estacao in porCodigo.Values) estacao.ConferidoEm = agora;
        await _db.SaveChangesAsync(ct);
    }

    private async Task GravarLeiturasAsync(string codIbge, DateTime agora, CancellationToken ct)
    {
        var acumulados = (await _client.ObterAcumuladosAsync(codIbge, ct))
            .Where(a => a.CodEstacao.Length <= 20)
            .GroupBy(a => (a.CodEstacao, a.DataHoraUtc)).Select(g => g.First())
            .ToList();
        if (acumulados.Count == 0) return;

        // A mesma resposta servida de novo (cache do lado deles) não vira linha repetida.
        var desde = acumulados.Min(a => a.DataHoraUtc);
        var jaGravadas = (await _db.LeiturasEstacaoCemaden
                .Where(l => l.DataHora >= desde)
                .Select(l => new { l.CodEstacao, l.DataHora })
                .ToListAsync(ct))
            .Select(l => (l.CodEstacao, DateTime.SpecifyKind(l.DataHora, DateTimeKind.Utc)))
            .ToHashSet();

        foreach (var a in acumulados.Where(a => !jaGravadas.Contains((a.CodEstacao, a.DataHoraUtc))))
            _db.LeiturasEstacaoCemaden.Add(new LeituraEstacaoCemaden
            {
                CodEstacao = a.CodEstacao,
                DataHora = a.DataHoraUtc,
                ColetadoEm = agora,
                Acc1h = a.Acc1h, Acc3h = a.Acc3h, Acc6h = a.Acc6h, Acc12h = a.Acc12h, Acc24h = a.Acc24h,
                Acc48h = a.Acc48h, Acc72h = a.Acc72h, Acc96h = a.Acc96h, Acc120h = a.Acc120h,
            });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyDictionary<Guid, ChuvaCemadenRegiao>> ObterPorSubprefeituraAsync(
        DateTime agoraUtc, CancellationToken ct = default)
    {
        // ponytail: sem cache, relido a cada chamada (até uns 500 registros). Cache em memória
        // por ciclo quando a rota pública pesar ou entrar a segunda cidade.
        var desde = agoraUtc.AddMinutes(-ValidadeMinutos);
        var ate = agoraUtc.AddMinutes(FolgaRelogioMinutos);
        var ultimas = (await _db.LeiturasEstacaoCemaden
                .Where(l => l.DataHora >= desde && l.DataHora <= ate)
                .ToListAsync(ct))
            .GroupBy(l => l.CodEstacao)
            .Select(g => g.MaxBy(l => l.DataHora)!)
            .Where(l => l.Acc1h is not null || l.Acc24h is not null)
            .ToDictionary(l => l.CodEstacao);
        if (ultimas.Count == 0) return new Dictionary<Guid, ChuvaCemadenRegiao>();

        var estacoes = (await _db.EstacoesCemaden.ToListAsync(ct)).Where(e => ultimas.ContainsKey(e.CodEstacao)).ToList();
        var subs = await _db.Subprefeituras.Where(s => s.Ativa).ToListAsync(ct);

        var resultado = new Dictionary<Guid, ChuvaCemadenRegiao>();
        foreach (var sub in subs)
        {
            var perto = estacoes
                .Select(e => (Estacao: e, Leitura: ultimas[e.CodEstacao],
                    Km: GeoDistancia.HaversineMetros(sub.Latitude, sub.Longitude, e.Latitude, e.Longitude) / 1000))
                .Where(x => x.Km <= RaioKm)
                .OrderBy(x => x.Km)
                .ToList();
            var h1 = perto.FirstOrDefault(x => x.Leitura.Acc1h is not null);
            var h24 = perto.FirstOrDefault(x => x.Leitura.Acc24h is not null);
            if (h1.Estacao is null && h24.Estacao is null) continue;

            resultado[sub.Id] = new ChuvaCemadenRegiao(sub.Id,
                h1.Leitura?.Acc1h, h1.Estacao?.Nome, Utc(h1.Leitura?.DataHora),
                h24.Leitura?.Acc24h, h24.Estacao?.Nome, Utc(h24.Leitura?.DataHora));
        }
        return resultado;
    }

    private static DateTime? Utc(DateTime? d) => d is { } v ? DateTime.SpecifyKind(v, DateTimeKind.Utc) : null;
}
