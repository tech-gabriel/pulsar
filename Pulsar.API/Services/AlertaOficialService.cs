using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Alertas;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Score;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Traz os alertas oficiais da Defesa Civil para o banco. O motor de notificações e o app leem
/// daqui, nunca do feed: uma queda da IDAP só deixa os alertas gravados valerem até a validade.
/// </summary>
public class AlertaOficialService : IAlertaOficialService
{
    /// <summary>Quanto tempo um alerta fica guardado depois da validade (conferência e calibração).</summary>
    public static readonly TimeSpan Retencao = TimeSpan.FromDays(30);

    private readonly PulsarDbContext _db;
    private readonly IIdapClient _feed;
    private readonly IGradeCelulas _grade;
    private readonly ILogger<AlertaOficialService> _logger;

    public AlertaOficialService(PulsarDbContext db, IIdapClient feed, IGradeCelulas grade, ILogger<AlertaOficialService> logger)
    {
        _db = db;
        _feed = feed;
        _grade = grade;
        _logger = logger;
    }

    public async Task<ResultadoSincronizacao> SincronizarAsync(DateTime agoraUtc, CancellationToken ct = default)
    {
        var execucao = new ExecucaoSincronizacao
        {
            Fonte = ExecucaoSincronizacao.FonteIdap, IniciadoEm = agoraUtc, CriadoEm = agoraUtc, AtualizadoEm = agoraUtc,
        };
        var alertas = await _feed.ObterAsync(ct);
        if (alertas is null)
        {
            execucao.FinalizadoEm = DateTime.UtcNow;
            execucao.Erro = "Feed da IDAP indisponível.";
            _db.ExecucoesSincronizacao.Add(execucao);
            await _db.SaveChangesAsync(ct);
            return new ResultadoSincronizacao(false, 0, 0, false);
        }

        var subs = await _db.Subprefeituras.Include(s => s.Regiao).ThenInclude(r => r.Cidade)
            .Where(s => s.Ativa).ToListAsync(ct);
        var areas = subs.Select(s => new AreaParaCasar(s.Id, s.CodigoIbge ?? s.Regiao.Cidade.CodigoIbge,
            _grade.DaArea(s.Nome).Select(c => (c.Lat, c.Lon)).ToList())).ToList();

        var ids = alertas.Select(a => a.Identificador).Concat(alertas.SelectMany(a => a.Referencias)).ToHashSet();
        var existentes = await _db.AlertasOficiais.Where(a => ids.Contains(a.Identificador))
            .ToDictionaryAsync(a => a.Identificador, ct);

        int novos = 0, cancelados = 0;
        foreach (var a in alertas.OrderBy(a => a.EnviadoUtc))
        {
            // Cancel e Update encerram o alerta a que se referem; o Update segue como alerta novo.
            if (a.TipoMensagem is "Cancel" or "Update")
                foreach (var r in a.Referencias)
                    if (existentes.TryGetValue(r, out var antigo) && antigo.CanceladoEmUtc is null)
                    {
                        antigo.CanceladoEmUtc = a.EnviadoUtc;
                        cancelados++;
                    }
            if (a.TipoMensagem == "Cancel" || existentes.ContainsKey(a.Identificador)) continue;

            var atingidas = CasamentoAlerta.Areas(a, areas);
            if (atingidas.Count == 0) continue;
            var novo = new AlertaOficial
            {
                Identificador = a.Identificador, Evento = a.Evento, Gravidade = a.Gravidade, Urgencia = a.Urgencia,
                InicioUtc = a.InicioUtc, ExpiraUtc = a.ExpiraUtc, Emissor = a.Emissor, Titulo = a.Titulo,
                Descricao = a.Descricao, RecebidoEmUtc = agoraUtc,
                Areas = atingidas.Select(id => new AlertaOficialArea { SubprefeituraId = id }).ToList(),
            };
            _db.AlertasOficiais.Add(novo);
            existentes[a.Identificador] = novo;
            novos++;
        }

        var limite = agoraUtc - Retencao;
        _db.AlertasOficiais.RemoveRange(await _db.AlertasOficiais.Where(a => a.ExpiraUtc < limite).ToListAsync(ct));

        execucao.Sucesso = true;
        execucao.Lidas = alertas.Count;
        execucao.Novas = novos;
        execucao.FinalizadoEm = DateTime.UtcNow;
        _db.ExecucoesSincronizacao.Add(execucao);
        await _db.SaveChangesAsync(ct);

        var haAlertaSp = alertas.Any(a => a.TipoMensagem != "Cancel" && a.InicioUtc <= agoraUtc && agoraUtc < a.ExpiraUtc
            && (a.Emissor.Contains("São Paulo", StringComparison.OrdinalIgnoreCase) || a.Emissor.Contains("(SP)", StringComparison.Ordinal)));
        if (novos > 0 || cancelados > 0)
            _logger.LogInformation("Alertas oficiais: {Novos} novos, {Cancelados} cancelados ({Lidos} no feed).", novos, cancelados, alertas.Count);
        return new ResultadoSincronizacao(true, novos, cancelados, haAlertaSp);
    }

    public async Task<IReadOnlyDictionary<Guid, IReadOnlyList<AlertaOficial>>> AtivosPorAreaAsync(
        DateTime agoraUtc, CancellationToken ct = default)
    {
        var ativos = await _db.AlertasOficiais.Include(a => a.Areas)
            .Where(a => a.CanceladoEmUtc == null && a.InicioUtc <= agoraUtc && a.ExpiraUtc > agoraUtc)
            .ToListAsync(ct);
        return ativos.SelectMany(a => a.Areas.Select(ar => (ar.SubprefeituraId, Alerta: a)))
            .GroupBy(x => x.SubprefeituraId)
            .ToDictionary(g => g.Key,
                g => (IReadOnlyList<AlertaOficial>)g.Select(x => x.Alerta).OrderByDescending(x => x.InicioUtc).ToList());
    }
}
