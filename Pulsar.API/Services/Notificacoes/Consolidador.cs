using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>Um push que já saiu para a pessoa, como o consolidador o enxerga (linha do livro-caixa).</summary>
public record EnvioAnterior(Guid SubprefeituraId, string Gatilho, string Chave, Guid EnvioId, DateTime EnviadoEm);

/// <summary>Tudo que o consolidador precisa saber de uma pessoa. Montado pelo motor.</summary>
/// <param name="Criterios">União das preferências dos aparelhos dela (a preferência é por aparelho).</param>
/// <param name="Recentes">Envios das últimas <c>JanelaTetoDiarioHoras</c>, para dedup, cooldown e teto.</param>
public record DestinatarioPush(
    Guid UsuarioId,
    IReadOnlySet<Guid> Favoritas,
    IReadOnlySet<CriterioOptIn> Criterios,
    IReadOnlyList<EnvioAnterior> Recentes,
    TimeZoneInfo Fuso);

/// <summary>O push que sai para a pessoa neste ciclo e os eventos que ele cobre.</summary>
public record EnvioConsolidado(Guid UsuarioId, CriterioOptIn Criterio, PushPayload Payload, IReadOnlyList<NotificacaoPendente> Incluidas);

/// <summary>
/// Etapa 2 do motor: "o que esta pessoa precisa saber agora?". Puro (sem banco, sem rede,
/// sem relógio), por isso testável isoladamente. Os gatilhos respondem "o que está
/// acontecendo em cada subprefeitura?"; aqui só se decide entrega.
/// </summary>
public static class Consolidador
{
    public static EnvioConsolidado? Consolidar(
        DestinatarioPush d, IReadOnlyList<NotificacaoPendente> pendencias, DateTime agoraUtc)
    {
        // O dedup entra ANTES da escolha: uma pendência que a pessoa já recebeu não pode
        // ocupar a vaga de uma que ela não recebeu (mesma regra do motor antigo).
        var candidatas = pendencias
            .Where(p => d.Favoritas.Contains(p.SubprefeituraId))
            .Where(p => d.Criterios.Contains(p.Criterio))
            .Where(p => !JaCoberta(d.Recentes, p, agoraUtc))
            .OrderBy(p => p.Prioridade)
            .ThenBy(p => p.Criterio)
            .ToList();
        if (candidatas.Count == 0) return null;

        var lider = candidatas[0];
        if (lider.Prioridade != LimiaresNotificacao.PrioridadeScoreAlto && EstourouTeto(d, agoraUtc))
            return null;

        // Mesmo gatilho E mesmo critério: o aparelho filtra por um critério só, então um
        // grupo misto chegaria a quem não optou por parte dele.
        var grupo = candidatas.Where(p => p.Gatilho == lider.Gatilho && p.Criterio == lider.Criterio).ToList();
        return new EnvioConsolidado(d.UsuarioId, lider.Criterio, MontarPayload(grupo), grupo);
    }

    /// <summary>Sem Cooldown vale a chave exata; com Cooldown, a janela deslizante do gatilho NA subprefeitura.</summary>
    private static bool JaCoberta(IReadOnlyList<EnvioAnterior> recentes, NotificacaoPendente p, DateTime agora)
        => p.Cooldown is { } cooldown
            ? recentes.Any(r => r.SubprefeituraId == p.SubprefeituraId && r.Gatilho == p.Gatilho && r.EnviadoEm >= agora - cooldown)
            : recentes.Any(r => r.Chave == p.Chave);

    /// <summary>Conta ENVIOS (EnvioId distintos) do dia local, inclusive os de risco alto.</summary>
    private static bool EstourouTeto(DestinatarioPush d, DateTime agora)
    {
        var hoje = FusoLocal.DiaLocal(agora, d.Fuso);
        return d.Recentes
            .Where(r => FusoLocal.DiaLocal(r.EnviadoEm, d.Fuso) == hoje)
            .Select(r => r.EnvioId)
            .Distinct()
            .Count() >= LimiaresNotificacao.MaxPushPorUsuarioPorDia;
    }

    private static PushPayload MontarPayload(IReadOnlyList<NotificacaoPendente> grupo)
    {
        if (grupo.Count == 1) return grupo[0].Payload;

        var gatilho = grupo[0].Gatilho;
        var lista = ListaNomes([.. grupo.Select(p => p.Local)]);
        var (titulo, corpo) = gatilho switch
        {
            // Sem "de alagamento": o perigo de cada uma pode ser vento ou calor.
            "score-alto" => ($"Alerta em {lista}", "Toque para ver o que está acontecendo em cada uma."),
            "chuva-prevista" => ($"Chuva forte prevista em {lista}", "Toque para ver o horário previsto em cada uma."),
            "briefing-diario" => ("Suas subprefeituras hoje",
                string.Join(" ", grupo.Take(2).Select(p => $"{p.Local}: {p.Payload.Corpo}"))
                + (grupo.Count > 2 ? $" E mais {grupo.Count - 2}." : "")),
            _ => ($"Alerta em {lista}", grupo[0].Payload.Corpo),
        };
        // Tag pelo gatilho: o push novo substitui o anterior do mesmo tipo na bandeja.
        return new PushPayload(titulo, corpo, Url: "/", Tag: gatilho);
    }

    public static string ListaNomes(IReadOnlyList<string> nomes) => nomes.Count switch
    {
        1 => nomes[0],
        2 => $"{nomes[0]} e {nomes[1]}",
        _ => $"{nomes[0]}, {nomes[1]} e mais {nomes.Count - 2}",
    };
}
