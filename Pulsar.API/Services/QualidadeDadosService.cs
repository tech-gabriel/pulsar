using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Score;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Monta o painel de qualidade dos dados: a chuva do OWM (agregado diário) contra a do
/// Open-Meteo, as horas que a PlausibilidadeChuva barrou, os buracos de coleta e os pontos
/// do CGE. A regra dos avisos fica no <see cref="AvaliadorQualidade"/>.
/// </summary>
public class QualidadeDadosService : IQualidadeDadosService
{
    /// <summary>O painel é aberto à mão; uma hora de cache poupa o Open-Meteo sem esconder o dia.</summary>
    private static readonly TimeSpan CacheOpenMeteo = TimeSpan.FromHours(1);

    /// <summary>
    /// Primeiro dia com os pontos do CGE gravados (AS3). Antes dele a tabela vazia não quer
    /// dizer "nenhum alagamento", e sim "não guardávamos".
    /// </summary>
    private static readonly DateOnly InicioColetaCge = new(2026, 10, 26);

    private readonly PulsarDbContext _db;
    private readonly IChuvaReferenciaClient _chuvaReferencia;
    private readonly IMemoryCache _cache;
    private readonly ILogger<QualidadeDadosService> _logger;

    public QualidadeDadosService(
        PulsarDbContext db, IChuvaReferenciaClient chuvaReferencia, IMemoryCache cache, ILogger<QualidadeDadosService> logger)
    {
        _db = db;
        _chuvaReferencia = chuvaReferencia;
        _cache = cache;
        _logger = logger;
    }

    public async Task<QualidadeDadosDto> ObterAsync(int dias, CancellationToken ct = default)
    {
        var agora = DateTime.UtcNow;
        var subs = await _db.Subprefeituras.Include(s => s.Regiao).Where(s => s.Ativa).OrderBy(s => s.Nome).ToListAsync(ct);

        // Janela UTC com um dia de folga; cada instante é filtrado pelo seu dia local (ver FusoLocal).
        var desdeUtc = agora.Date.AddDays(-dias);
        var desdeDia = DateOnly.FromDateTime(desdeUtc);
        var diarios = await _db.AgregadosDiarios.Where(a => a.Dia >= desdeDia).ToListAsync(ct);
        var horarios = await _db.AgregadosHorarios.Where(a => a.HoraUtc >= desdeUtc).ToListAsync(ct);
        var pontos = await _db.PontosAlagamentoCge.Where(p => p.Dia >= desdeDia).ToListAsync(ct);

        // A série horária começou no AS2 (26/10/2026). Hora anterior a ela é "sem dado", não falha de coleta.
        var primeiraHora = await _db.AgregadosHorarios.MinAsync(a => (DateTime?)a.HoraUtc, ct);
        var openMeteo = await ObterOpenMeteoAsync(subs, dias, ct);

        var avisos = new List<AvisoQualidadeDto>();
        var linhas = new List<QualidadeSubprefeituraDto>();
        for (var i = 0; i < subs.Count; i++)
        {
            var sub = subs[i];
            var tz = TimeZoneInfo.FindSystemTimeZoneById(sub.Regiao.FusoHorario);
            var hoje = FusoLocal.DiaLocal(agora, tz);

            var horasDaSub = horarios.Where(h => h.SubprefeituraId == sub.Id).ToDictionary(h => h.HoraUtc);
            var horasPorDia = HorasFechadas(primeiraHora, desdeUtc, agora)
                .GroupBy(h => FusoLocal.DiaLocal(h, tz))
                .ToDictionary(g => g.Key, g => g.Select(h => horasDaSub.GetValueOrDefault(h)).ToList());

            var omPorDia = openMeteo?[i]
                .Where(kv => kv.Key.AddHours(1) <= agora)
                .GroupBy(kv => FusoLocal.DiaLocal(kv.Key, tz))
                .ToDictionary(g => g.Key, g => g.Sum(kv => kv.Value));

            var diasDaSub = Enumerable.Range(0, dias).Select(n => hoje.AddDays(-n)).Select(dia =>
            {
                var diario = diarios.FirstOrDefault(a => a.SubprefeituraId == sub.Id && a.Dia == dia);
                var horas = horasPorDia.GetValueOrDefault(dia);
                return new DiaQualidade(
                    dia,
                    diario is null ? null : Math.Round(diario.ChuvaTotalMm, 1),
                    omPorDia is null ? null : Math.Round(omPorDia.GetValueOrDefault(dia), 1),
                    horas?.Count(h => h is not null && h.ChuvaBrutaMm > h.ChuvaMm + 0.05),
                    horas?.Count(h => h is null || h.LeiturasCount < AvaliadorQualidade.MinLeiturasHora),
                    pontos.Count(p => p.SubprefeituraId == sub.Id && p.Dia == dia),
                    diario is not null && diario.ScoreAlagamentoMax > ClassificacaoRisco.LimiteModerado,
                    dia < InicioColetaCge ? null : pontos.Count(p => p.Dia == dia));
            }).ToList();

            foreach (var dia in diasDaSub)
                avisos.AddRange(AvaliadorQualidade.Avaliar(dia).Select(a => new AvisoQualidadeDto
                {
                    Tipo = a.Tipo, Subprefeitura = sub.Nome, Dia = dia.Dia, Detalhe = a.Detalhe,
                }));

            linhas.Add(new QualidadeSubprefeituraDto
            {
                Id = sub.Id,
                Nome = sub.Nome,
                ChuvaPulsarMm = Somar(diasDaSub.Select(d => d.ChuvaPulsarMm)),
                ChuvaOpenMeteoMm = Somar(diasDaSub.Select(d => d.ChuvaOpenMeteoMm)),
                HorasBarradas = (int?)Somar(diasDaSub.Select(d => (double?)d.HorasBarradas)),
                HorasIncompletas = (int?)Somar(diasDaSub.Select(d => (double?)d.HorasIncompletas)),
                PontosCge = diasDaSub.Sum(d => d.PontosCge),
                Dias = diasDaSub.Select(d => new QualidadeDiaDto
                {
                    Dia = d.Dia,
                    ChuvaPulsarMm = d.ChuvaPulsarMm,
                    ChuvaOpenMeteoMm = d.ChuvaOpenMeteoMm,
                    HorasBarradas = d.HorasBarradas,
                    HorasIncompletas = d.HorasIncompletas,
                    PontosCge = d.PontosCge,
                    TeveAlerta = d.TeveAlerta,
                }).ToList(),
            });
        }

        var geoSampa = await ObterGeoSampaAsync(ct);
        var primeiraTentativa = await _db.ExecucoesSincronizacao
            .Where(x => x.Fonte == ExecucaoSincronizacao.FonteGeoSampa)
            .MinAsync(x => (DateTime?)x.IniciadoEm, ct);
        var avisoGeoSampa = AvaliadorQualidade.AvaliarGeoSampa(geoSampa.UltimoSucesso, primeiraTentativa, geoSampa.UltimoErro, agora);

        return new QualidadeDadosDto
        {
            Dias = dias,
            OpenMeteoDisponivel = openMeteo is not null,
            // O aviso da cidade inteira vai no topo: sem ele, o resto do painel pode estar velho.
            Avisos =
            [
                .. avisoGeoSampa is null ? [] : new[] { new AvisoQualidadeDto
                {
                    Tipo = avisoGeoSampa.Tipo, Dia = DateOnly.FromDateTime(agora), Detalhe = avisoGeoSampa.Detalhe,
                } },
                .. avisos.OrderByDescending(a => a.Dia).ThenBy(a => a.Subprefeitura),
            ],
            Subprefeituras = linhas,
            GeoSampa = geoSampa,
        };
    }

    private async Task<SincronizacaoFonteDto> ObterGeoSampaAsync(CancellationToken ct)
    {
        var execucoes = _db.ExecucoesSincronizacao.Where(x => x.Fonte == ExecucaoSincronizacao.FonteGeoSampa);
        var ultima = await execucoes.OrderByDescending(x => x.IniciadoEm).FirstOrDefaultAsync(ct);
        var ultimoSucesso = await execucoes.Where(x => x.Sucesso).OrderByDescending(x => x.IniciadoEm).FirstOrDefaultAsync(ct);
        return new SincronizacaoFonteDto
        {
            UltimaTentativa = ultima?.IniciadoEm,
            UltimaTentativaSucesso = ultima?.Sucesso,
            UltimoErro = ultima is { Sucesso: false } ? ultima.Erro : null,
            UltimoSucesso = ultimoSucesso?.IniciadoEm,
            NovasNoUltimoSucesso = ultimoSucesso?.Novas,
        };
    }

    /// <summary>Início de cada hora UTC já encerrada na janela, a partir da primeira hora gravada.</summary>
    private static IEnumerable<DateTime> HorasFechadas(DateTime? primeiraHora, DateTime desdeUtc, DateTime agora)
    {
        if (primeiraHora is null) yield break;
        var inicio = primeiraHora.Value > desdeUtc ? primeiraHora.Value : desdeUtc;
        for (var h = inicio; h.AddHours(1) <= agora; h = h.AddHours(1))
            yield return h;
    }

    private static double? Somar(IEnumerable<double?> valores)
    {
        var comDado = valores.Where(v => v is not null).ToList();
        return comDado.Count == 0 ? null : Math.Round(comDado.Sum()!.Value, 1);
    }

    /// <summary>Série por subprefeitura, na ordem de <paramref name="subs"/>; null se o Open-Meteo falhar.</summary>
    private async Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>?> ObterOpenMeteoAsync(
        IReadOnlyList<Subprefeitura> subs, int dias, CancellationToken ct)
    {
        var chave = $"qualidade:openmeteo:{dias}:{subs.Count}";
        if (_cache.TryGetValue(chave, out IReadOnlyList<IReadOnlyDictionary<DateTime, double>>? emCache))
            return emCache;

        try
        {
            // Um dia a mais cobre a diferença entre o dia UTC e o dia local.
            var series = await _chuvaReferencia.ObterHorariaPassadaAsync(
                [.. subs.Select(s => (s.Latitude, s.Longitude))], dias + 1, ct);
            if (series.Count != subs.Count) return null;
            _cache.Set(chave, series, CacheOpenMeteo);
            return series;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Open-Meteo indisponível: o painel de qualidade abre sem a segunda fonte.");
            return null;
        }
    }
}
