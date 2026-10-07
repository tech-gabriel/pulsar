using System.Globalization;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Migra o comportamento que vivia no AlertaService: score da subprefeitura na faixa
/// ALTO dispara aviso, com cooldown de 1 hora. A copy foi reescrita porque
/// "Score máximo: 78,3" é o sistema falando consigo mesmo.
/// </summary>
public class GatilhoScoreAlto : IGatilhoNotificacao
{
    public string Nome => "score-alto";

    public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        ContextoGatilho ctx, CancellationToken ct = default)
    {
        var pior = ctx.Pior;
        if (pior?.Score is null || pior.Score.Faixa != FaixaRisco.ALTO)
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        var em = NomesSubprefeitura.ComPreposicao(ctx.Subprefeitura.Nome);
        var (titulo, corpo) = Copy(pior.Score, pior.Leitura, em);

        var pendencia = new NotificacaoPendente(
            Gatilho: Nome,
            // O instante entra só para o registro ser único na tabela. Quem decide se
            // o push sai é o Cooldown, não a chave. InvariantCulture porque isto é
            // chave de banco, não texto: cultura com calendário não gregoriano mudaria
            // o ano e quebraria a comparação com registros antigos. O perigo entra para o
            // silêncio da Atenção (Consolidador) saber de qual perigo foi o Alerta.
            Chave: $"score:{ctx.Subprefeitura.Id}:{pior.Score.PerigoPrincipal}:{ctx.AgoraUtc.ToString("yyyyMMddHHmm", CultureInfo.InvariantCulture)}",
            Criterio: CriterioOptIn.RiscoAlto,
            Payload: new PushPayload(
                Titulo: titulo,
                Corpo: corpo,
                Url: NomesSubprefeitura.UrlDetalhe(ctx.Subprefeitura.Nome),
                Tag: $"alerta-{ctx.Subprefeitura.Id}"),
            Prioridade: LimiaresNotificacao.PrioridadeScoreAlto,
            Cooldown: LimiaresNotificacao.CooldownScoreAlto,
            SubprefeituraId: ctx.Subprefeitura.Id,
            Local: ctx.Subprefeitura.Nome);

        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([pendencia]);
    }

    /// <summary>Título e corpo pelo perigo que pôs a subprefeitura em ALTO.</summary>
    private static (string Titulo, string Corpo) Copy(ScorePerigo score, LeituraClimatica? leitura, string em)
    {
        // Cultura explícita: sem ela o host sem locale formataria "12.4 mm" no meio de
        // uma frase em português. Ver LimiaresNotificacao.CulturaCopy.
        var c = LimiaresNotificacao.CulturaCopy;
        return score.PerigoPrincipal switch
        {
            TipoPerigo.VENTO => ($"Alerta de vento forte {em}", leitura is null
                ? "Ventos fortes agora. Cuidado com árvores e estruturas soltas."
                : string.Create(c, $"Ventos de {leitura.VentoKmH:0} km/h agora.")),
            TipoPerigo.CALOR => ($"Alerta de calor extremo {em}", leitura is null
                ? "Calor extremo agora. Hidrate-se e evite sol forte."
                : string.Create(c, $"Sensação térmica de {leitura.SensacaoTermica:0} °C. Hidrate-se e evite sol forte.")),
            // Cita o acumulado de 3h que está no score, e não a chuva do instante: o ALTO
            // pode vir de uma chuva que já parou, e "0 mm por hora" desmentiria o aviso.
            _ => ($"Alerta de alagamento {em}", score.Chuva3hMm <= 0
                ? "Condições de alerta agora. Evite áreas de alagamento."
                : string.Create(c, $"Chuva de {score.Chuva3hMm:0.#} mm nas últimas 3 horas")
                  + (score.Chuva48hMm >= LimiaresNotificacao.SoloEncharcadoMm ? ", com o solo já encharcado." : ".")),
        };
    }
}
