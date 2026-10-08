using Pulsar.API.Domain.Enums;
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
            .Where(p => !SilenciadaPorAlerta(d.Recentes, p, agoraUtc))
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

    /// <summary>
    /// Atenção do perigo P calada se houve Alerta do MESMO perigo na mesma subprefeitura há
    /// menos de SilencioAtencaoAposAlertaHoras: é melhora, não aviso novo. Perigo diferente
    /// passa. Chave antiga de score-alto (sem perigo, gravada antes desta versão) conta como
    /// "qualquer perigo": cala por no máximo 6 h depois do deploy, e nunca lança.
    /// </summary>
    private static bool SilenciadaPorAlerta(IReadOnlyList<EnvioAnterior> recentes, NotificacaoPendente p, DateTime agora)
    {
        if (p.Gatilho != "atencao" || p.Perigo is not { } perigo) return false;
        var desde = agora.AddHours(-LimiaresNotificacao.SilencioAtencaoAposAlertaHoras);
        return recentes.Any(r => r.Gatilho == "score-alto"
            && r.SubprefeituraId == p.SubprefeituraId
            && r.EnviadoEm >= desde
            && (PerigoDaChaveDeAlerta(r.Chave) is not { } doAlerta || doAlerta == perigo));
    }

    /// <summary>"score:{id}:{PERIGO}:{instante}" devolve o perigo; formato antigo devolve null.</summary>
    private static TipoPerigo? PerigoDaChaveDeAlerta(string chave)
    {
        var partes = chave.Split(':');
        return partes.Length == 4 && Enum.TryParse<TipoPerigo>(partes[2], out var perigo) ? perigo : null;
    }

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

        // Vários eventos de UMA subprefeitura (hoje só a Atenção, um por perigo): o push
        // continua sendo dela, então abre o detalhe dela e fala com a preposição certa.
        if (grupo[0].Gatilho == "atencao" && grupo.Select(p => p.SubprefeituraId).Distinct().Count() == 1)
            return new PushPayload(
                $"Atenção {NomesSubprefeitura.ComPreposicao(grupo[0].Local)}",
                "Mais de um perigo pede cuidado. Toque para ver as dicas.",
                Url: grupo[0].Payload.Url,
                Tag: grupo[0].Payload.Tag);

        var gatilho = grupo[0].Gatilho;
        var lista = ListaNomes([.. grupo.Select(p => p.Local).Distinct()]);
        var (titulo, corpo) = gatilho switch
        {
            // Sem "de alagamento": o perigo de cada uma pode ser vento ou calor.
            "score-alto" => ($"Alerta em {lista}", "Toque para ver o que está acontecendo em cada uma."),
            "atencao" => ($"Atenção em {lista}", "Toque para ver os detalhes."),
            // O grupo tem um critério só (ver Consolidar), então a faixa vale para todas.
            "chuva-prevista" => (grupo[0].Criterio == CriterioOptIn.RiscoAlto
                    ? $"Alerta: chuva muito forte prevista em {lista}"
                    : $"Atenção: chuva forte prevista em {lista}", "Toque para ver o horário previsto em cada uma."),
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
