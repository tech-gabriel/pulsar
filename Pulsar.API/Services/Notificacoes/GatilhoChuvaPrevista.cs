using System.Globalization;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Avisa de chuva forte prevista nas próximas horas, que é a promessa da feature: dizer
/// antes de começar a chover. Como o plano grátis do OpenWeatherMap não tem previsão
/// horária, só passos de 3h, o aviso é de uma JANELA de 3h e não de um instante.
///
/// EM ABERTO: a DIREÇÃO dessa janela em relação ao carimbo (<c>InstantePrevisto</c>)
/// não está confirmada. A doc do OpenWeatherMap descreve <c>rain.3h</c> como "volume das
/// ÚLTIMAS 3 horas", o que faria o carimbo das 18h cobrir 15h-18h; mas essa frase é
/// herdada do endpoint de tempo atual, e muitas implementações leem a entrada como
/// cobrindo dt-&gt;dt+3h. Resolver isso exige conferir previsão contra chuva observada,
/// trabalho empírico que ainda não foi feito. Por isso a copy diz "por volta das {hora}h":
/// fica verdadeira nas duas leituras, porque ±3h é honestamente "por volta de". NÃO
/// troque por "das X às Y" nem por "a partir de X" antes de resolver a direção: erraria
/// em até 3h justamente o aviso cujo valor inteiro é a antecedência.
///
/// Duas condições juntas (volume e probabilidade) para o app não gritar por garoa.
/// </summary>
public class GatilhoChuvaPrevista : IGatilhoNotificacao
{
    public string Nome => "chuva-prevista";

    public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        ContextoGatilho ctx, CancellationToken ct = default)
    {
        var limiteJanela = ctx.AgoraUtc.AddHours(LimiaresNotificacao.JanelaPrevisaoHoras);

        // A PRIMEIRA faixa qualificada, não a mais intensa: o valor de um aviso está em
        // avisar do que chega primeiro. O OrderBy é cinto e suspensório, porque o contexto
        // já entrega as faixas em ordem crescente (ContextoGatilho.Previsao).
        var faixa = ctx.Previsao
            .Where(f => f.InstantePrevisto <= limiteJanela)
            .Where(f => f.ChuvaMm >= LimiaresNotificacao.ChuvaFortePrevistaMm
                     && f.ProbabilidadeChuva >= LimiaresNotificacao.ProbabilidadeMinima)
            .OrderBy(f => f.InstantePrevisto)
            .FirstOrDefault();

        if (faixa is null)
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        var rotulo = LimiaresNotificacao.Rotulo(ctx.Regiao.Nome);

        // Hora de parede da região, para o aviso falar no relógio de quem lê. O retorno tem
        // Kind Unspecified de propósito: serve para exibir e não volta para conta nenhuma.
        // É o carimbo da janela, e a copy o apresenta como aproximação ("por volta das"):
        // ver a ressalva sobre a direção da janela no doc da classe.
        var horaLocal = FusoLocal.ConverterParaLocal(faixa.InstantePrevisto, ctx.Fuso);

        // Quem só assinou risco alto recebe o temporal, mas não a chuva meramente forte.
        var criterio = faixa.ChuvaMm >= LimiaresNotificacao.ChuvaMuitoFortePrevistaMm
            ? CriterioOptIn.RiscoAlto
            : CriterioOptIn.RiscoModerado;

        var pendencia = new NotificacaoPendente(
            Gatilho: Nome,
            // A faixa prevista entra na chave porque é ela que define "a mesma notificação":
            // sem Cooldown, o motor manda exatamente uma vez por chave, então previsão que
            // muda de horário volta a avisar. InvariantCulture porque isto é chave de banco,
            // não texto: cultura com calendário não gregoriano mudaria o ano e quebraria a
            // comparação com os registros antigos.
            Chave: $"chuva:{ctx.Regiao.Id}:{faixa.InstantePrevisto.ToString("yyyyMMddHHmm", CultureInfo.InvariantCulture)}",
            Criterio: criterio,
            Payload: new PushPayload(
                Titulo: $"Chuva forte prevista na {rotulo}",
                // Cultura explícita: sem ela o host sem locale escreveria "12.4 mm" no meio
                // de uma frase em português. Ver LimiaresNotificacao.CulturaCopy.
                Corpo: string.Create(
                    LimiaresNotificacao.CulturaCopy,
                    $"{faixa.ChuvaMm:0.#} mm previstos por volta das {horaLocal:HH}h. Se puder, antecipe a saída."),
                Url: "/",
                Tag: $"chuva-{ctx.Regiao.Id}"),
            // Cooldown fica no default null de propósito: aqui o dedup é pela chave exata
            // da faixa, exatamente um aviso por janela prevista, e não janela deslizante.
            Prioridade: LimiaresNotificacao.PrioridadeChuvaPrevista);

        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([pendencia]);
    }
}
