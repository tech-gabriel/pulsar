using System.Globalization;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Subprefeitura em Atenção agora (faixa geral MODERADO): um aviso por perigo em Atenção,
/// só para quem ligou "alertas moderados". Alerta não passa por aqui (tem gatilho próprio).
/// O silêncio depois de um Alerta do mesmo perigo fica no Consolidador, que vê o livro-caixa.
/// </summary>
public class GatilhoAtencao : IGatilhoNotificacao
{
    public string Nome => "atencao";

    public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(ContextoGatilho ctx, CancellationToken ct = default)
    {
        var score = ctx.Pior?.Score;
        if (score is null || score.Faixa != FaixaRisco.MODERADO)
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([]);

        var perigos = new[]
            {
                (Perigo: TipoPerigo.ALAGAMENTO, Faixa: score.FaixaAlagamento),
                (Perigo: TipoPerigo.VENTO, Faixa: score.FaixaVento),
                (Perigo: TipoPerigo.CALOR, Faixa: score.FaixaCalor),
            }
            .Where(x => x.Faixa == FaixaRisco.MODERADO)
            .Select(x => x.Perigo)
            .ToList();
        // Score de antes do S1 não tem componentes (ficam no default BAIXO): sem isto o
        // aviso sumiria mesmo com a subprefeitura em Atenção.
        if (perigos.Count == 0) perigos.Add(score.PerigoPrincipal);

        var em = NomesSubprefeitura.ComPreposicao(ctx.Subprefeitura.Nome);
        var dia = FusoLocal.DiaLocal(ctx.AgoraUtc, ctx.Fuso).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var leitura = ctx.Pior!.Leitura;

        var pendencias = perigos.Select(perigo =>
        {
            var (titulo, corpo) = Copy(perigo, score, leitura, em);
            return new NotificacaoPendente(
                Gatilho: Nome,
                // Um por subprefeitura, perigo e dia LOCAL: oscilar entre Tranquilo e
                // Atenção à tarde não vira vários avisos. Invariant: é chave de banco.
                Chave: $"atencao:{ctx.Subprefeitura.Id}:{perigo}:{dia}",
                Criterio: CriterioOptIn.RiscoModerado,
                Payload: new PushPayload(titulo, corpo,
                    Url: NomesSubprefeitura.UrlDetalhe(ctx.Subprefeitura.Nome),
                    Tag: $"atencao-{ctx.Subprefeitura.Id}"),
                Prioridade: LimiaresNotificacao.PrioridadeAtencao,
                SubprefeituraId: ctx.Subprefeitura.Id,
                Local: ctx.Subprefeitura.Nome,
                Perigo: perigo);
        }).ToList();

        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>(pendencias);
    }

    private static (string Titulo, string Corpo) Copy(TipoPerigo perigo, ScorePerigo score, LeituraClimatica? leitura, string em)
    {
        // Cultura explícita pelo mesmo motivo do GatilhoScoreAlto. Ver LimiaresNotificacao.CulturaCopy.
        var c = LimiaresNotificacao.CulturaCopy;
        return perigo switch
        {
            TipoPerigo.VENTO => ($"Atenção: vento {em}", leitura is null
                ? "Ventos fortes agora. Cuidado com árvores e estruturas soltas."
                : string.Create(c, $"Ventos de {leitura.VentoKmH:0} km/h agora.")),
            TipoPerigo.CALOR => ($"Atenção: calor {em}", leitura is null
                ? "Calor forte agora. Hidrate-se e evite sol forte."
                : string.Create(c, $"Sensação térmica de {leitura.SensacaoTermica:0} °C. Hidrate-se e evite sol forte.")),
            _ => ($"Atenção: chuva {em}", score.Chuva3hMm <= 0
                ? "Condições de atenção para alagamento agora."
                : string.Create(c, $"Chuva de {score.Chuva3hMm:0.#} mm nas últimas 3 horas.")),
        };
    }
}
