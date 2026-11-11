using System.Globalization;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Avisa quem tem casa ou trabalho na subprefeitura que um posto do CGE-SP ali perto mediu chuva
/// forte na última meia hora (AS7). Existe para o céu limpo: a previsão pede que a pessoa confie
/// no app contra o que ela vê pela janela; este aviso traz um fato medido no bairro ao lado.
///
/// Só afirma o que foi medido: onde e quanto. Não diz que a chuva vem para cá nem quando chega
/// (decisão do user: horário prometido que erra custa a confiança que o aviso quer ganhar).
///
/// Não sai quando o posto PRÓPRIO da subprefeitura já mede chuva forte: aí a chuva está aqui, e
/// quem fala disso são o "começou a chover" e o alerta de score. Medição emprestada de vizinho
/// não conta como "já chove aqui".
///
/// O texto ("perto da sua casa") é montado por pessoa no Consolidador; o payload daqui é reserva.
/// </summary>
public class GatilhoChuvaMedidaPerto : IGatilhoNotificacao
{
    public string Nome => "chuva-medida-perto";

    public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(ContextoGatilho ctx, CancellationToken ct = default)
    {
        var jaChoveForteAqui = ctx.ChuvaMedida is { Vizinho: false, Mm30: >= LimiaresNotificacao.ChuvaForteMedidaMm30 };
        var maisForte = ctx.ChuvaMedidaPerto
            .Where(m => m.Medida.Mm30 >= LimiaresNotificacao.ChuvaForteMedidaMm30)
            .MaxBy(m => m.Medida.Mm30);
        if (jaChoveForteAqui || maisForte is null)
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        var sub = ctx.Subprefeitura;
        var mm = maisForte.Medida.Mm30!.Value;

        var pendencia = new NotificacaoPendente(
            Gatilho: Nome,
            // Por hora cheia: o cooldown é quem segura a repetição; a chave só identifica o episódio.
            Chave: $"chuva-medida-perto:{sub.Id}:{ctx.AgoraUtc.ToString("yyyyMMddHH", CultureInfo.InvariantCulture)}",
            Criterio: CriterioOptIn.ChuvaLocais,
            Payload: new PushPayload(
                Titulo: Titulo(maisForte.NomeSubprefeitura),
                Corpo: $"{Fato(mm)} Toque para ver no mapa.",
                Url: "/app",
                Tag: Nome),
            Prioridade: LimiaresNotificacao.PrioridadeChuvaMedidaPerto,
            Cooldown: TimeSpan.FromHours(LimiaresNotificacao.CooldownChuvaMedidaPertoHoras),
            SubprefeituraId: sub.Id,
            Local: sub.Nome,
            MedidoMm30: mm,
            LocalMedicao: maisForte.NomeSubprefeitura);

        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([pendencia]);
    }

    public static string Titulo(string localMedicao)
        => $"Chove forte {NomesSubprefeitura.ComPreposicao(localMedicao)} agora";

    /// <summary>"O CGE mediu 18 mm em 30 minutos." A fonte vai junto de todo número medido.</summary>
    public static string Fato(double mm30)
        => $"O CGE mediu {mm30.ToString("0.#", LimiaresNotificacao.CulturaCopy)} mm em 30 minutos.";
}
