using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Chuva;
using Pulsar.API.Domain.Entities;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Traz a chuva medida dos postos do CGE-SP para o banco, uma vez por ciclo, e responde qual
/// medição vale para cada subprefeitura. Alerta e tela leem daqui, nunca da página: se o CGE
/// cai, as leituras envelhecem e a região volta para "estimado" sozinha.
/// </summary>
public class EstacaoCgeService : IEstacaoCgeService
{
    /// <summary>
    /// Até onde o posto de outra subprefeitura ainda fala por esta (distância entre os centros).
    /// Sem teto, com um posto só no ar, a zona sul mostraria a chuva da zona oeste como sua.
    /// </summary>
    public const double RaioVizinhoKm = 10.0;

    /// <summary>Cobre a janela de 60 min com a folga da base e as leituras do "posto parado".</summary>
    private const int JanelaLeituraMinutos = 135;

    private readonly PulsarDbContext _db;
    private readonly ICgeEstacaoClient _client;
    private readonly ILogger<EstacaoCgeService> _logger;

    public EstacaoCgeService(PulsarDbContext db, ICgeEstacaoClient client, ILogger<EstacaoCgeService> logger)
    {
        _db = db;
        _client = client;
        _logger = logger;
    }

    public async Task ColetarAsync(CancellationToken ct = default)
    {
        var subs = await _db.Subprefeituras.ToListAsync(ct);
        // Um instante só para o ciclo: as leituras de um mesmo ciclo são comparáveis entre postos.
        var agora = DateTime.UtcNow;

        foreach (var posto in PostosCge.Todos)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var bruta = await _client.ObterAsync(posto.Id, ct);
                if (bruta is null)
                {
                    _logger.LogWarning("Posto {Posto} ({Nome}) do CGE-SP sem chuva na página.", posto.Id, posto.Nome);
                    continue;
                }

                _db.LeiturasEstacaoCge.Add(new LeituraEstacaoCge
                {
                    Posto = posto.Id,
                    SubprefeituraId = posto.Subprefeitura is null ? null : AlagamentoCgeService.Casar(posto.Subprefeitura, subs)?.Id,
                    ColetadoEm = agora,
                    ChuvaPeriodoMm = bruta.ChuvaPeriodoMm,
                    ChuvaPeriodoAnteriorMm = bruta.ChuvaPeriodoAnteriorMm,
                    Zeramento = bruta.Zeramento,
                    TemperaturaC = bruta.TemperaturaC,
                    UmidadePct = bruta.UmidadePct,
                    VentoDirecao = bruta.VentoDirecao,
                    VentoKmH = bruta.VentoKmH,
                    RajadaKmH = bruta.RajadaKmH,
                    PressaoHpa = bruta.PressaoHpa,
                });
            }
            catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Falha ao ler o posto {Posto} ({Nome}) do CGE-SP.", posto.Id, posto.Nome);
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyDictionary<Guid, ChuvaMedidaRegiao>> ObterPorSubprefeituraAsync(
        DateTime agoraUtc, CancellationToken ct = default)
    {
        // ponytail: sem cache, relido a cada chamada (umas 300 linhas). Cache em memória por
        // ciclo quando a rota pública pesar.
        var desde = agoraUtc.AddMinutes(-JanelaLeituraMinutos);
        var porPosto = (await _db.LeiturasEstacaoCge
                .Where(l => l.ColetadoEm >= desde && l.ColetadoEm <= agoraUtc)
                .OrderBy(l => l.ColetadoEm)
                .ToListAsync(ct))
            .ToLookup(l => l.Posto);
        if (porPosto.Count == 0) return new Dictionary<Guid, ChuvaMedidaRegiao>();

        var subs = await _db.Subprefeituras.Where(s => s.Ativa).ToListAsync(ct);

        // Medição do posto PRÓPRIO de cada subprefeitura: o primeiro válido na ordem da tabela.
        // Posto de fora da capital (Subprefeitura null) nunca entra.
        var proprias = new Dictionary<Guid, ChuvaMedidaRegiao>();
        foreach (var posto in PostosCge.Todos)
        {
            if (posto.Subprefeitura is null) continue;
            var sub = AlagamentoCgeService.Casar(posto.Subprefeitura, subs);
            if (sub is null || proprias.ContainsKey(sub.Id)) continue;
            if (Medir(posto, sub.Id, [.. porPosto[posto.Id]], agoraUtc) is { } medida)
                proprias[sub.Id] = medida;
        }

        var resultado = new Dictionary<Guid, ChuvaMedidaRegiao>(proprias);
        foreach (var sub in subs.Where(s => !proprias.ContainsKey(s.Id)))
        {
            var vizinha = subs
                .Where(o => proprias.ContainsKey(o.Id))
                .Select(o => (o.Id, Km: GeoDistancia.HaversineMetros(sub.Latitude, sub.Longitude, o.Latitude, o.Longitude) / 1000))
                .Where(x => x.Km <= RaioVizinhoKm)
                .OrderBy(x => x.Km)
                .FirstOrDefault();
            if (vizinha.Id != Guid.Empty)
                resultado[sub.Id] = proprias[vizinha.Id] with { SubprefeituraId = sub.Id, Vizinho = true };
        }
        return resultado;
    }

    /// <summary>Null quando o posto não tem dado válido agora (sem leitura, velha ou parado).</summary>
    private static ChuvaMedidaRegiao? Medir(PostoCge posto, Guid subId, IReadOnlyList<LeituraEstacaoCge> leituras, DateTime agora)
    {
        var emOrdem = leituras
            .Select(l => new LeituraPosto(l.ColetadoEm, l.ChuvaPeriodoMm,
                $"{l.TemperaturaC}|{l.UmidadePct}|{l.VentoDirecao}|{l.VentoKmH}|{l.RajadaKmH}|{l.PressaoHpa}"))
            .ToList();
        // A janela de 15 min é a régua de validade: sem ela não há "agora" para mostrar.
        if (ChuvaMedida.MmNaJanela(emOrdem, agora, 15) is not { } mm15) return null;

        var ultima = leituras[^1];
        return new ChuvaMedidaRegiao(subId, posto.Id, posto.Nome, Vizinho: false,
            mm15, ChuvaMedida.MmNaJanela(emOrdem, agora, 30), ChuvaMedida.MmNaJanela(emOrdem, agora, 60),
            ultima.ChuvaPeriodoMm, ultima.ColetadoEm);
    }
}
