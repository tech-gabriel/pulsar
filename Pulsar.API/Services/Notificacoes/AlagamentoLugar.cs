using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Chuva;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Alerta de alagamento no trecho da casa ou do trabalho. Não é um <see cref="IGatilhoNotificacao"/>:
/// aqueles olham uma subprefeitura; este olha o hexágono de um endereço.
/// </summary>
public interface IAlagamentoLugar
{
    /// <summary>O trecho de um endereço salvo. Null fora da grade.</summary>
    CelulaGrade? CelulaDe(double lat, double lon);

    /// <summary>
    /// Uma pendência por trecho em Alerta agora. Só com chuva MEDIDA: trecho sem estação
    /// válida por perto não gera aviso (a pessoa segue com os avisos da área).
    /// </summary>
    Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        IReadOnlyCollection<CelulaGrade> celulas, DateTime agoraUtc, CancellationToken ct = default);
}

public class AlagamentoLugar : IAlagamentoLugar
{
    public const string Nome = "alagamento-lugar";

    private readonly PulsarDbContext _db;
    private readonly IGradeCelulas _grade;
    private readonly ICemadenService _cemaden;

    public AlagamentoLugar(PulsarDbContext db, IGradeCelulas grade, ICemadenService cemaden)
    {
        _db = db;
        _grade = grade;
        _cemaden = cemaden;
    }

    public CelulaGrade? CelulaDe(double lat, double lon) => _grade.MaisProxima(lat, lon);

    public async Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        IReadOnlyCollection<CelulaGrade> celulas, DateTime agoraUtc, CancellationToken ct = default)
    {
        if (celulas.Count == 0) return [];
        var estacoes = await _cemaden.ObterEstacoesComChuvaAsync(agoraUtc, ct);
        if (estacoes.Count == 0) return [];

        // Banco só quando alguma estação perto de um lugar mediu chuva: é o caso raro.
        Dictionary<string, Subprefeitura>? areas = null;
        var modelos = new Dictionary<Guid, EntradaScore>();
        var pendencias = new List<NotificacaoPendente>();
        foreach (var celula in celulas)
        {
            var estacao = EstacaoChuva.MaisProxima(celula.Lat, celula.Lon, estacoes, RiscoTrecho.RaioEstacaoKm);
            if (estacao is null || estacao.Mm3h <= 0) continue;

            areas ??= await _db.Subprefeituras.AsNoTracking().Where(a => a.Ativa).ToDictionaryAsync(a => a.Nome, ct);
            if (!areas.TryGetValue(celula.Sub, out var area)) continue;
            if (!modelos.TryGetValue(area.Id, out var modelo))
                modelos[area.Id] = modelo = await ModeloAsync(area, ct);

            if (RiscoTrecho.ComChuvaMedida(modelo, estacao, celula.Fator).Faixa != FaixaRisco.ALTO) continue;
            pendencias.Add(Pendencia(celula, area, estacao, agoraUtc));
        }
        return pendencias;
    }

    /// <summary>
    /// A chuva de modelo da área, que só entra na saturação de 48 h quando a estação não a
    /// manda. Sem leitura, zeros: a conta segue só com o que foi medido.
    /// </summary>
    private async Task<EntradaScore> ModeloAsync(Subprefeitura area, CancellationToken ct)
    {
        var desde = DateTime.UtcNow.AddHours(-ScoreService.JanelaHoras);
        var leituras = await _db.LeiturasClimaticas.AsNoTracking()
            .Where(l => l.SubprefeituraId == area.Id && l.Timestamp >= desde)
            .ToListAsync(ct);
        return leituras.Count == 0 ? new EntradaScore(0, 0, 0, 0, 0, area.Nome) : ScoreService.MontarEntrada(area.Nome, leituras);
    }

    private static NotificacaoPendente Pendencia(CelulaGrade celula, Subprefeitura area, EstacaoChuva estacao, DateTime agoraUtc)
    {
        var c = LimiaresNotificacao.CulturaCopy;
        var km = Math.Max(0.1, GeoDistancia.HaversineMetros(celula.Lat, celula.Lon, estacao.Lat, estacao.Lon) / 1000);
        // O fator do trecho acima do da área é o histórico de alagamento dele.
        var costumaAlagar = celula.Fator > CalibracaoScore.Atual.Fator(celula.Sub) + 1e-9;
        var corpo = string.Create(c, $"Choveu {estacao.Mm3h:0.#} mm nas últimas 3 horas, medidos a {km:0.0} km.")
            + (costumaAlagar ? " Esse trecho costuma alagar." : "")
            + " Toque para ver no mapa.";

        return new NotificacaoPendente(
            Gatilho: Nome,
            // Como no score alto: o instante só torna o registro único; quem segura a repetição é o Cooldown.
            Chave: $"lugar:{celula.H3}:{agoraUtc.ToString("yyyyMMddHHmm", System.Globalization.CultureInfo.InvariantCulture)}",
            Criterio: CriterioOptIn.RiscoAlto,
            // Título e destino do toque dependem de ser casa ou trabalho: o Consolidador monta por pessoa.
            Payload: new PushPayload("Alerta de alagamento", corpo, Url: "/app", Tag: Nome),
            Prioridade: LimiaresNotificacao.PrioridadeScoreAlto,
            Cooldown: LimiaresNotificacao.CooldownScoreAlto,
            SubprefeituraId: area.Id,
            Local: area.Nome,
            Perigo: TipoPerigo.ALAGAMENTO,
            Celula: celula.H3);
    }
}
