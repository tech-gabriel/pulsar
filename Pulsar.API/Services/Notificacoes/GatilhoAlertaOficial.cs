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
/// Um push por alerta e área (a chave leva o identificador); fora o Extremo, 1 por área a cada 3 h, e
/// depois disso o mesmo tipo de alerta sai como lembrete (ver Consolidador.EhLembrete).
/// </summary>
public partial class GatilhoAlertaOficial : IGatilhoNotificacao
{
    public string Nome => LimiaresNotificacao.GatilhoAlertaOficial;

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
            // Decisão do user (18/11/2026): Minor e Unknown só aparecem no app.
            if (NivelDe(alerta.Gravidade) is not (> 0 and var nivel))
                continue;
            var extremo = nivel == 3;
            if (!extremo && (ctx.PontosCgeAtivos.Count > 0 || !TemSinalProprio(alerta, ctx.Estado.Score)))
                continue;

            var em = NomesSubprefeitura.ComPreposicao(ctx.Subprefeitura.Nome);
            var url = NomesSubprefeitura.UrlDetalhe(ctx.Subprefeitura.Nome);
            var perigo = PerigoDoEvento(alerta.Evento);
            pendencias.Add(new NotificacaoPendente(
                Gatilho: Nome,
                // O nível e o perigo vão na chave: o consolidador lê deles o último envio da área
                // (nível para a janela de 3 h; perigo para saber se é lembrete do mesmo tipo de alerta).
                Chave: $"dc:{nivel}:{perigo?.ToString() ?? "GERAL"}:{alerta.Identificador}:{ctx.Subprefeitura.Id}",
                Criterio: alerta.Gravidade is "Extreme" or "Severe" ? CriterioOptIn.RiscoAlto : CriterioOptIn.RiscoModerado,
                Payload: new PushPayload(
                    Titulo: extremo ? $"Alerta extremo da Defesa Civil {em}" : $"Alerta da Defesa Civil {em}",
                    Corpo: Corpo(alerta, ctx.Fuso),
                    Url: url,
                    Tag: $"alerta-{ctx.Subprefeitura.Id}"),
                Prioridade: extremo ? LimiaresNotificacao.PrioridadeAlertaExtremo : LimiaresNotificacao.PrioridadeAlertaComSinal,
                // Decisão do user (18/11/2026): 1 aviso por área a cada 3 h; o Extremo sempre passa.
                Cooldown: extremo ? null : TimeSpan.FromHours(LimiaresNotificacao.CooldownAlertaOficialHoras),
                Nivel: nivel,
                SubprefeituraId: ctx.Subprefeitura.Id,
                Local: ctx.Subprefeitura.Nome,
                Perigo: perigo,
                // Decisão do user (18/11/2026): depois das 3 h, o mesmo tipo de alerta sai como lembrete atualizado.
                Lembrete: new PushPayload(
                    Titulo: $"Alerta da Defesa Civil segue valendo {em}",
                    Corpo: $"{EventoLegivel(alerta.Evento)} até {AteQuando(alerta.ExpiraUtc, ctx.AgoraUtc, ctx.Fuso)}. Toque para ver o aviso.",
                    Url: url,
                    Tag: $"alerta-{ctx.Subprefeitura.Id}")));
        }
        return Task.FromResult<IReadOnlyList<NotificacaoPendente>>(pendencias);
    }

    private static readonly System.Globalization.CultureInfo PtBr = System.Globalization.CultureInfo.GetCultureInfo("pt-BR");

    /// <summary>"CHUVAS INTENSAS" vira "Chuvas intensas" (como no app).</summary>
    public static string EventoLegivel(string evento)
    {
        var e = evento.Trim().ToLower(PtBr);
        return e.Length == 0 ? e : char.ToUpper(e[0], PtBr) + e[1..];
    }

    /// <summary>"16:30" se vence hoje (no fuso da pessoa); "21/11, 16:18" se vence em outro dia (como no app).</summary>
    public static string AteQuando(DateTime expiraUtc, DateTime agoraUtc, TimeZoneInfo fuso)
    {
        var fim = TimeZoneInfo.ConvertTimeFromUtc(expiraUtc, fuso);
        var hoje = TimeZoneInfo.ConvertTimeFromUtc(agoraUtc, fuso).Date;
        return fim.Date == hoje ? $"{fim:HH:mm}" : $"{fim:dd/MM}, {fim:HH:mm}";
    }

    /// <summary>Nível do alerta pela gravidade do CAP: Moderate 1, Severe 2, Extreme 3; o resto 0 (sem push).</summary>
    public static int NivelDe(string gravidade) => gravidade switch { "Moderate" => 1, "Severe" => 2, "Extreme" => 3, _ => 0 };

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
        if (corpo.Length <= MaxCorpo) return corpo;
        // Sem partir um emoji (par de surrogates) ao meio no corte.
        var fim = MaxCorpo - 1;
        if (char.IsHighSurrogate(corpo[fim - 1])) fim--;
        return corpo[..fim].TrimEnd() + "…";
    }

    // O título da IDAP começa com "Defesa Civil:" e às vezes com a hora ("14h05"), que o corpo já diz.
    [GeneratedRegex(@"^\s*Defesa Civil\s*:\s*(\d{1,2}h\d{2}\s*)?", RegexOptions.IgnoreCase)]
    private static partial Regex PrefixoDoTitulo();
}
