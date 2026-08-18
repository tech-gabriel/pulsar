using System.Globalization;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Migra o comportamento que vivia no AlertaService: pior score da região na faixa
/// ALTO dispara aviso, com cooldown de 1 hora. A copy foi reescrita porque
/// "Score máximo: 78,3" é o sistema falando consigo mesmo.
/// </summary>
public class GatilhoScoreAlto : IGatilhoNotificacao
{
    public string Nome => "score-alto";

    public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        ContextoGatilho ctx, CancellationToken ct = default)
    {
        // Olhar só o maior score da região equivale a procurar qualquer subprefeitura
        // na faixa ALTO, porque a faixa é derivada do valor (ScorePerigo.ClassificarFaixa):
        // o maior valor sempre carrega a pior faixa.
        var pior = ctx.Pior;
        if (pior?.Score is null || pior.Score.Faixa != FaixaRisco.ALTO)
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        var rotulo = LimiaresNotificacao.Rotulo(ctx.Regiao.Nome);
        var leitura = pior.Leitura;

        // Cultura explícita: sem ela o host sem locale formataria "12.4 mm" no meio de
        // uma frase em português. Ver LimiaresNotificacao.CulturaCopy.
        var corpo = leitura is null
            ? "Condições de risco alto agora. Evite áreas de alagamento."
            : string.Create(
                LimiaresNotificacao.CulturaCopy,
                $"Chuva de {leitura.ChuvaMmH:0.#} mm por hora e vento de {leitura.VentoKmH:0.#} km/h agora.");

        var pendencia = new NotificacaoPendente(
            Gatilho: Nome,
            // O instante entra só para o registro ser único na tabela. Quem decide se
            // o push sai é o Cooldown, não a chave. InvariantCulture porque isto é
            // chave de banco, não texto: cultura com calendário não gregoriano mudaria
            // o ano e quebraria a comparação com registros antigos.
            Chave: $"score:{ctx.Regiao.Id}:{ctx.AgoraUtc.ToString("yyyyMMddHHmm", CultureInfo.InvariantCulture)}",
            Criterio: CriterioOptIn.RiscoAlto,
            Payload: new PushPayload(
                Titulo: $"Risco alto na {rotulo}",
                Corpo: corpo,
                Url: "/",
                Tag: $"alerta-{ctx.Regiao.Id}"),
            Prioridade: LimiaresNotificacao.PrioridadeScoreAlto,
            Cooldown: LimiaresNotificacao.CooldownScoreAlto);

        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([pendencia]);
    }
}
