using System.Globalization;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Nível Perigo: o CGE-SP marcou ponto de alagamento ativo na subprefeitura. É o único aviso que
/// não é estimativa, por isso sai na hora, passa na frente dos outros e não respeita o teto
/// diário. O motor só entrega pontos vistos há pouco (LimiaresNotificacao.ValidadePontoCge),
/// então um CGE fora do ar cala este gatilho em vez de mantê-lo gritando.
/// </summary>
public class GatilhoAlagamentoCge : IGatilhoNotificacao
{
    public string Nome => "alagamento-cge";

    public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        ContextoGatilho ctx, CancellationToken ct = default)
    {
        var pontos = ctx.PontosCgeAtivos.Count;
        if (pontos == 0)
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        var em = NomesSubprefeitura.ComPreposicao(ctx.Subprefeitura.Nome);
        var pendencia = new NotificacaoPendente(
            Gatilho: Nome,
            // O instante só torna o registro único; quem decide é o Cooldown, como no score alto.
            Chave: $"cge:{ctx.Subprefeitura.Id}:{ctx.AgoraUtc.ToString("yyyyMMddHHmm", CultureInfo.InvariantCulture)}",
            Criterio: CriterioOptIn.RiscoAlto,
            Payload: new PushPayload(
                Titulo: $"Alagamento {em} agora",
                Corpo: pontos == 1
                    ? "O CGE registrou um ponto de alagamento. Evite a região se puder."
                    : $"O CGE registrou {pontos} pontos de alagamento. Evite a região se puder.",
                Url: NomesSubprefeitura.UrlDetalhe(ctx.Subprefeitura.Nome),
                Tag: $"alerta-{ctx.Subprefeitura.Id}"),
            Prioridade: LimiaresNotificacao.PrioridadePerigoCge,
            Cooldown: LimiaresNotificacao.CooldownPerigoCge,
            SubprefeituraId: ctx.Subprefeitura.Id,
            Local: ctx.Subprefeitura.Nome,
            Perigo: TipoPerigo.ALAGAMENTO);

        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([pendencia]);
    }
}
