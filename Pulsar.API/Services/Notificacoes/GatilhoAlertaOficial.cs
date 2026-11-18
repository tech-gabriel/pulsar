using System.Text.RegularExpressions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Alerta oficial da Defesa Civil (IDAP) na área, pela regra C do user (17/11/2026):
/// <list type="bullet">
/// <item>Extremo: push na hora, sempre citando a fonte, fora do teto diário;</item>
/// <item>outros níveis: push só se o Pulsar vê sinal próprio no mesmo lugar (o perigo do alerta em
/// Atenção ou acima, ou chuva medida); sem sinal, o alerta só aparece no app;</item>
/// <item>capital: com ponto de alagamento do CGE ativo, o não Extremo não vira um segundo push.</item>
/// </list>
/// Um push por alerta e área (a chave leva o identificador do alerta, sem cooldown).
/// </summary>
public partial class GatilhoAlertaOficial : IGatilhoNotificacao
{
    public string Nome => "alerta-oficial";

    /// <summary>Tamanho máximo do corpo do push (a bandeja corta o resto).</summary>
    private const int MaxCorpo = 180;

    public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(ContextoGatilho ctx, CancellationToken ct = default)
    {
        var pendencias = new List<NotificacaoPendente>();
        foreach (var alerta in ctx.AlertasOficiaisAtivos)
        {
            // O livro-caixa só lembra os envios das últimas JanelaTetoDiarioHoras: um alerta mais velho
            // que isso (menos uma hora de folga para o ciclo) já teve a chance dele e não volta a avisar.
            if (ctx.AgoraUtc - alerta.InicioUtc >= TimeSpan.FromHours(LimiaresNotificacao.JanelaTetoDiarioHoras - 1))
                continue;
            var extremo = alerta.Gravidade == "Extreme";
            if (!extremo && (ctx.PontosCgeAtivos.Count > 0 || !TemSinalProprio(alerta, ctx.Estado.Score)))
                continue;

            var em = NomesSubprefeitura.ComPreposicao(ctx.Subprefeitura.Nome);
            pendencias.Add(new NotificacaoPendente(
                Gatilho: Nome,
                Chave: $"dc:{alerta.Identificador}:{ctx.Subprefeitura.Id}",
                Criterio: alerta.Gravidade is "Extreme" or "Severe" ? CriterioOptIn.RiscoAlto : CriterioOptIn.RiscoModerado,
                Payload: new PushPayload(
                    Titulo: extremo ? $"Alerta extremo da Defesa Civil {em}" : $"Alerta da Defesa Civil {em}",
                    Corpo: Corpo(alerta, ctx.Fuso),
                    Url: NomesSubprefeitura.UrlDetalhe(ctx.Subprefeitura.Nome),
                    Tag: $"alerta-{ctx.Subprefeitura.Id}"),
                Prioridade: extremo ? LimiaresNotificacao.PrioridadeAlertaExtremo : LimiaresNotificacao.PrioridadeAlertaComSinal,
                SubprefeituraId: ctx.Subprefeitura.Id,
                Local: ctx.Subprefeitura.Nome,
                Perigo: PerigoDoEvento(alerta.Evento)));
        }
        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>(pendencias);
    }

    /// <summary>O perigo do Pulsar que corresponde ao evento do alerta; null quando não há um só.</summary>
    public static TipoPerigo? PerigoDoEvento(string evento)
    {
        var e = evento.ToUpperInvariant();
        if (e.Contains("VENDAVAL") || e.Contains("VENTO") || e.Contains("GRANIZO")) return TipoPerigo.VENTO;
        if (e.Contains("CHUVA") || e.Contains("ALAGAMENTO") || e.Contains("INUNDA") || e.Contains("ENXURRADA")) return TipoPerigo.ALAGAMENTO;
        if (e.Contains("CALOR") || e.Contains("TEMPERATURA")) return TipoPerigo.CALOR;
        return null;
    }

    private static bool TemSinalProprio(AlertaOficial alerta, ScorePerigo? score)
    {
        if (score is null) return false;
        return PerigoDoEvento(alerta.Evento) switch
        {
            TipoPerigo.ALAGAMENTO => score.FaixaAlagamento >= FaixaRisco.MODERADO
                                     || (score.Chuva3hMedidaMm ?? 0) >= LimiaresNotificacao.ChuvaMedidaSinalMm,
            TipoPerigo.VENTO => score.FaixaVento >= FaixaRisco.MODERADO,
            TipoPerigo.CALOR => score.FaixaCalor >= FaixaRisco.MODERADO,
            _ => score.Faixa >= FaixaRisco.MODERADO,
        };
    }

    /// <summary>"Defesa Civil Estadual De São Paulo, 14h05: Chuva forte na capital. ..." A fonte e a hora sempre vão juntas.</summary>
    private static string Corpo(AlertaOficial alerta, TimeZoneInfo fuso)
    {
        var hora = TimeZoneInfo.ConvertTimeFromUtc(alerta.InicioUtc, fuso);
        var texto = PrefixoDoTitulo().Replace(alerta.Titulo, "").Trim();
        var corpo = $"{alerta.Emissor}, {hora:HH}h{hora:mm}: {texto}";
        return corpo.Length <= MaxCorpo ? corpo : corpo[..(MaxCorpo - 1)].TrimEnd() + "…";
    }

    // O título da IDAP começa com "Defesa Civil:" e às vezes com a hora ("14h05"), que o corpo já diz.
    [GeneratedRegex(@"^\s*Defesa Civil\s*:\s*(\d{1,2}h\d{2}\s*)?", RegexOptions.IgnoreCase)]
    private static partial Regex PrefixoDoTitulo();
}
