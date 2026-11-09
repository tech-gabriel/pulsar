using System.Globalization;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Avisa quem tem casa ou trabalho na subprefeitura que a chuva começou lá (F4b).
///
/// Olha um EPISÓDIO, não só "atual × anterior": a leitura atual tem chuva e houve uma seca na
/// última hora. Assim, se o ciclo da virada não enviar (outro push ganhou a vaga, Open-Meteo
/// fora), o ciclo seguinte ainda tenta; a chave leva o início do episódio e o cooldown de 3 h
/// segura a garoa que para e volta.
///
/// O Open-Meteo confirma: alguma hora entre 2 h antes e 2 h depois com pelo menos 0,1 mm.
/// Sem ele, não avisa (errar para o silêncio). Decisão do user: perde pancada localizada que o
/// Open-Meteo não previu em troca de não tocar o celular por chuva inventada (backlog PV2).
///
/// O texto ("perto da sua casa") é montado por pessoa no Consolidador; o payload daqui é reserva.
/// </summary>
public class GatilhoChuvaComecou : IGatilhoNotificacao
{
    public string Nome => "chuva-comecou";

    public static string? Intensidade(double mmH) => mmH switch
    {
        < LimiaresNotificacao.ChuvaComecouMmH => null,
        < LimiaresNotificacao.ChuvaModeradaMmH => "fraca",
        < LimiaresNotificacao.ChuvaForteMmH => "moderada",
        _ => "forte",
    };

    public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(ContextoGatilho ctx, CancellationToken ct = default)
    {
        var atual = ctx.Estado.Leitura;
        var intensidade = atual is null ? null : Intensidade(atual.ChuvaMmH);
        if (atual is null || intensidade is null || !Confirmada(ctx.ChuvaReferencia, atual.Timestamp))
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        var desde = atual.Timestamp.AddMinutes(-LimiaresNotificacao.JanelaChuvaComecouMinutos);
        var janela = ctx.LeiturasRecentes
            .Where(l => l.Timestamp >= desde && l.Timestamp <= atual.Timestamp)
            .OrderBy(l => l.Timestamp)
            .ToList();
        var ultimaSeca = janela.LastOrDefault(l => l.ChuvaMmH < LimiaresNotificacao.ChuvaComecouMmH);
        if (ultimaSeca is null)
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        var inicio = janela.FirstOrDefault(l => l.Timestamp > ultimaSeca.Timestamp)?.Timestamp ?? atual.Timestamp;
        var sub = ctx.Subprefeitura;
        var em = NomesSubprefeitura.ComPreposicao(sub.Nome);

        var pendencia = new NotificacaoPendente(
            Gatilho: Nome,
            // InvariantCulture: chave de banco, não texto.
            Chave: $"chuva-comecou:{sub.Id}:{inicio.ToString("yyyyMMddHHmm", CultureInfo.InvariantCulture)}",
            Criterio: CriterioOptIn.ChuvaLocais,
            Payload: new PushPayload(
                Titulo: $"Começou a chover {em}",
                Corpo: $"Chuva {intensidade} {em} agora.",
                Url: "/app",
                Tag: Nome),
            Prioridade: LimiaresNotificacao.PrioridadeChuvaComecou,
            Cooldown: TimeSpan.FromHours(LimiaresNotificacao.CooldownChuvaComecouHoras),
            SubprefeituraId: sub.Id,
            Local: sub.Nome,
            Intensidade: intensidade);

        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([pendencia]);
    }

    private static bool Confirmada(IReadOnlyDictionary<DateTime, double>? referencia, DateTime instante)
    {
        if (referencia is null) return false;
        var hora = new DateTime(instante.Year, instante.Month, instante.Day, instante.Hour, 0, 0, DateTimeKind.Utc);
        var folga = TimeSpan.FromHours(LimiaresNotificacao.FolgaChuvaAgoraHoras);
        return referencia.Any(r => r.Key >= hora - folga && r.Key <= hora + folga
                                   && r.Value >= LimiaresNotificacao.ConfirmacaoChuvaAgoraMm);
    }
}
