using System.Globalization;
using Pulsar.API.Domain.Entities;
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
        // na faixa ALTO, porque a faixa é derivada do valor (ClassificacaoRisco.Faixa):
        // o maior valor sempre carrega a pior faixa.
        var pior = ctx.Pior;
        if (pior?.Score is null || pior.Score.Faixa != FaixaRisco.ALTO)
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        var rotulo = LimiaresNotificacao.Rotulo(ctx.Regiao.Nome);
        var (titulo, corpo) = Copy(pior.Score.PerigoPrincipal, pior.Score.Chuva48hMm, pior.Leitura, rotulo);

        var pendencia = new NotificacaoPendente(
            Gatilho: Nome,
            // O instante entra só para o registro ser único na tabela. Quem decide se
            // o push sai é o Cooldown, não a chave. InvariantCulture porque isto é
            // chave de banco, não texto: cultura com calendário não gregoriano mudaria
            // o ano e quebraria a comparação com registros antigos.
            Chave: $"score:{ctx.Regiao.Id}:{ctx.AgoraUtc.ToString("yyyyMMddHHmm", CultureInfo.InvariantCulture)}",
            Criterio: CriterioOptIn.RiscoAlto,
            Payload: new PushPayload(
                Titulo: titulo,
                Corpo: corpo,
                Url: "/",
                Tag: $"alerta-{ctx.Regiao.Id}"),
            Prioridade: LimiaresNotificacao.PrioridadeScoreAlto,
            Cooldown: LimiaresNotificacao.CooldownScoreAlto);

        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([pendencia]);
    }

    /// <summary>Título e corpo pelo perigo que pôs a região em ALTO.</summary>
    private static (string Titulo, string Corpo) Copy(
        TipoPerigo perigo, double chuva48h, LeituraClimatica? leitura, string rotulo)
    {
        // Cultura explícita: sem ela o host sem locale formataria "12.4 mm" no meio de
        // uma frase em português. Ver LimiaresNotificacao.CulturaCopy.
        var c = LimiaresNotificacao.CulturaCopy;
        return perigo switch
        {
            TipoPerigo.VENTO => ($"Vento forte na {rotulo}", leitura is null
                ? "Ventos fortes agora. Cuidado com árvores e estruturas soltas."
                : string.Create(c, $"Ventos de {leitura.VentoKmH:0} km/h agora.")),
            TipoPerigo.CALOR => ($"Calor extremo na {rotulo}", leitura is null
                ? "Calor extremo agora. Hidrate-se e evite sol forte."
                : string.Create(c, $"Sensação térmica de {leitura.SensacaoTermica:0} °C. Hidrate-se e evite sol forte.")),
            _ => ($"Risco alto de alagamento na {rotulo}", leitura is null
                ? "Condições de risco alto agora. Evite áreas de alagamento."
                : string.Create(c, $"Chuva de {leitura.ChuvaMmH:0.#} mm por hora agora")
                  + (chuva48h >= LimiaresNotificacao.SoloEncharcadoMm ? ", com o solo já encharcado." : ".")),
        };
    }
}
