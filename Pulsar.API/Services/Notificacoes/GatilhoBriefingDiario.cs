using System.Globalization;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Resumo do dia, uma vez por dia local, a partir das 6h no fuso da região.
///
/// Paga uma dívida antiga: <c>AssinaturaPush.ResumoDiario</c> existe desde junho e a tela
/// de configurações promete "um resumo do clima da sua região, uma vez por dia", mas nada
/// no backend nunca enviou isso. Quem ligou o toggle está esperando desde então.
///
/// Sem cron novo: o ciclo de 15 min já roda sempre, então o primeiro ciclo depois das
/// 6h locais manda. Consequência aceita: se o serviço estiver fora do ar às 6h, o
/// briefing sai quando ele voltar; se ficar fora a manhã inteira, não sai. Não há retry.
///
/// Toda decisão de calendário aqui é UTC -&gt; local, via <see cref="FusoLocal"/>. A direção
/// inversa ("início do dia local em UTC") não existe de propósito e não deve ser
/// reintroduzida: em zona cuja virada do horário de verão cai à meia-noite, a meia-noite
/// local não existe naquele dia e a conversão lança. Ver o doc de <see cref="FusoLocal"/>.
/// </summary>
public class GatilhoBriefingDiario : IGatilhoNotificacao
{
    public string Nome => "briefing-diario";

    public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        ContextoGatilho ctx, CancellationToken ct = default)
    {
        var vazio = Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        // Hora de parede da região e não do servidor: é isto que faz o briefing sair às 6h
        // de QUEM LÊ quando entrar a segunda cidade. Nunca fixar America/Sao_Paulo aqui.
        if (FusoLocal.HoraLocal(ctx.AgoraUtc, ctx.Fuso) < LimiaresNotificacao.HoraBriefingLocal)
            return vazio;

        // Resumo sem score seria uma notificação vazia: gastaria a permissão de push que a
        // pessoa deu e não entregaria nada. Previsão faltando é diferente, e está tratado
        // abaixo: o risco de agora, sozinho, já é conteúdo.
        var pior = ctx.Pior;
        if (pior?.Score is null)
            return vazio;

        var corpo = $"Risco {TextoDaFaixa(pior.Score.Faixa)}.";

        // As faixas que caem dentro do horizonte do resumo. Materializada porque é lida
        // duas vezes: para achar a mais chuvosa e para saber se HOUVE previsão olhada.
        var janela = ctx.Previsao
            .Where(f => f.InstantePrevisto
                        <= ctx.AgoraUtc.AddHours(LimiaresNotificacao.JanelaBriefingHoras))
            .ToList();

        // A mais chuvosa, se houver alguma com chuva. O filtro por ChuvaMm > 0 é o que
        // impede a frase de inventar chuva num dia seco: sem ele o MaxBy devolveria a
        // primeira faixa de 0 mm e o resumo anunciaria "0 mm". Em empate o MaxBy fica com
        // a primeira da sequência, e o contexto entrega as faixas em ordem crescente,
        // então o empate escolhe a mais próxima, que é a útil.
        var maisChuvosa = janela.Where(f => f.ChuvaMm > 0).MaxBy(f => f.ChuvaMm);

        if (maisChuvosa is not null)
        {
            // Hora de parede da região, para o resumo falar no relógio de quem lê. O Kind
            // vem Unspecified de propósito: serve para exibir e não volta para conta
            // nenhuma, muito menos para montar a Chave.
            var horaLocal = FusoLocal.ConverterParaLocal(maisChuvosa.InstantePrevisto, ctx.Fuso);

            // Cultura explícita: sem ela o host sem locale escreveria "12.4 mm" no meio de
            // uma frase em português. Ver LimiaresNotificacao.CulturaCopy.
            corpo += string.Create(
                LimiaresNotificacao.CulturaCopy,
                $" Chuva mais forte prevista para as {horaLocal:HH}h, {maisChuvosa.ChuvaMm:0.#} mm.");
        }
        else if (janela.Count > 0)
        {
            // Dia seco é notícia, e é a notícia mais comum fora da temporada de chuva. Sem
            // esta frase o resumo do dia seco seria "Risco baixo." e nada mais, que é pouco
            // demais para uma notificação diária: quem recebe isso desliga o aviso, e o
            // toggle desligado é o pior desfecho para uma feature de retenção.
            //
            // "nas próximas horas" e não "hoje": o horizonte são 24h a partir de agora, que
            // às 6h locais alcança a manhã seguinte, e não o fim do dia de hoje. A frase
            // afirma MENOS do que foi conferido, que é o lado seguro de errar. Mesma
            // disciplina do "por volta das" em GatilhoChuvaPrevista.
            corpo += " Sem chuva prevista nas próximas horas.";
        }
        // Terceiro caso, de propósito sem frase: nenhuma faixa dentro do horizonte. Aí não
        // observamos ausência de chuva nenhuma, apenas não temos previsão, e afirmar "sem
        // chuva prevista" seria inventar uma ausência tanto quanto inventar a chuva.

        var diaLocal = FusoLocal.DiaLocal(ctx.AgoraUtc, ctx.Fuso);
        var rotulo = LimiaresNotificacao.Rotulo(ctx.Regiao.Nome);

        var pendencia = new NotificacaoPendente(
            Gatilho: Nome,
            // Uma chave por dia LOCAL: com Cooldown null o motor manda exatamente uma vez
            // por chave, e é isso que traduz o "uma vez por dia" prometido na tela de
            // configurações, apesar de o ciclo de 15 min reavaliar a manhã inteira.
            // O dia tem que ser o local: às 23h de São Paulo o UTC já virou, e usar o dia
            // UTC gastaria a cota de amanhã antes de amanhã começar.
            // InvariantCulture porque isto é chave de banco, não texto: cultura com
            // calendário não gregoriano escreveria 2569 e nunca casaria com os registros
            // antigos do livro-caixa.
            Chave: $"briefing:{ctx.Regiao.Id}:{diaLocal.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}",
            Criterio: CriterioOptIn.ResumoDiario,
            Payload: new PushPayload(
                // Maiúscula porque o rótulo abre o título: "Região Sul hoje".
                Titulo: $"{char.ToUpperInvariant(rotulo[0])}{rotulo[1..]} hoje",
                Corpo: corpo,
                Url: "/",
                Tag: $"briefing-{ctx.Regiao.Id}"),
            Prioridade: LimiaresNotificacao.PrioridadeBriefing);
        // Cooldown omitido de propósito (fica no default null): o dedup aqui é pela chave
        // exata do dia local, e não janela deslizante. Só o risco alto usa cooldown.

        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([pendencia]);
    }

    /// <summary>
    /// Nome da faixa em português corrido. Enum direto sairia "MODERADO" gritado no meio
    /// da frase, que é o sistema falando consigo mesmo.
    /// </summary>
    private static string TextoDaFaixa(FaixaRisco faixa) => faixa switch
    {
        FaixaRisco.ALTO => "alto",
        FaixaRisco.MODERADO => "moderado",
        _ => "baixo",
    };
}
