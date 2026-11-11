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
    TimeZoneInfo Fuso,
    IReadOnlyDictionary<Guid, IReadOnlySet<TipoLocal>>? Locais = null)
{
    /// <summary>Subprefeitura → casa e/ou trabalho salvos nela (F4b). Vazio para quem não salvou.</summary>
    public IReadOnlyDictionary<Guid, IReadOnlySet<TipoLocal>> LocaisOuVazio { get; } =
        Locais ?? new Dictionary<Guid, IReadOnlySet<TipoLocal>>();
}

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
            // O "começou a chover" e a chuva medida por perto são da casa e do trabalho, não das
            // favoritas (a casa pode ter ficado fora delas pelo teto de 10).
            .Where(p => p.Gatilho is ChuvaComecou or ChuvaMedidaPerto
                ? d.LocaisOuVazio.ContainsKey(p.SubprefeituraId)
                : d.Favoritas.Contains(p.SubprefeituraId))
            .Where(p => d.Criterios.Contains(p.Criterio))
            .Where(p => !JaCoberta(d.Recentes, p, agoraUtc))
            .Where(p => !SilenciadaPorAlerta(d.Recentes, p, agoraUtc))
            .Where(p => !SilenciadaPorNivelAcima(d.Recentes, p, agoraUtc))
            .OrderBy(p => p.Prioridade)
            .ThenBy(p => p.Criterio)
            .ToList();
        if (candidatas.Count == 0) return null;

        var lider = candidatas[0];
        // Perigo do CGE e score alto são isentos do teto (prioridade 0 e 1).
        if (lider.Prioridade > LimiaresNotificacao.PrioridadeScoreAlto && EstourouTeto(d, agoraUtc))
            return null;

        // Mesmo gatilho E mesmo critério: o aparelho filtra por um critério só, então um
        // grupo misto chegaria a quem não optou por parte dele.
        var grupo = candidatas.Where(p => p.Gatilho == lider.Gatilho && p.Criterio == lider.Criterio).ToList();
        var payload = lider.Gatilho switch
        {
            ChuvaComecou => PayloadChuvaComecou(grupo, d),
            ChuvaMedidaPerto => PayloadChuvaMedidaPerto(grupo, d),
            _ => MontarPayload(grupo),
        };
        return new EnvioConsolidado(d.UsuarioId, lider.Criterio, payload, grupo);
    }

    private const string ChuvaComecou = "chuva-comecou";
    private const string ChuvaMedidaPerto = "chuva-medida-perto";

    private static IReadOnlySet<TipoLocal> TiposDe(NotificacaoPendente p, DestinatarioPush d) =>
        d.LocaisOuVazio.TryGetValue(p.SubprefeituraId, out var t) ? t : new HashSet<TipoLocal>();

    /// <summary>
    /// Um push, um fato medido: o do posto perto da casa (ou do trabalho, sem casa no aviso). O
    /// "perto da sua casa e do trabalho" só sai quando os dois lugares apontam para o MESMO posto;
    /// juntar postos diferentes numa frase afirmaria proximidade que não existe.
    /// </summary>
    private static PushPayload PayloadChuvaMedidaPerto(IReadOnlyList<NotificacaoPendente> grupo, DestinatarioPush d)
    {
        var lider = grupo.OrderBy(p => TiposDe(p, d).Contains(TipoLocal.CASA) ? 0 : 1).First();
        var tipos = grupo.Where(p => p.LocalMedicao == lider.LocalMedicao).SelectMany(p => TiposDe(p, d)).ToHashSet();
        var casa = tipos.Contains(TipoLocal.CASA);
        var perto = (casa, tipos.Contains(TipoLocal.TRABALHO)) switch
        {
            (true, true) => "da sua casa e do trabalho",
            (true, false) => "da sua casa",
            _ => "do seu trabalho",
        };

        return new PushPayload(
            GatilhoChuvaMedidaPerto.Titulo(lider.LocalMedicao ?? lider.Local),
            $"{GatilhoChuvaMedidaPerto.Fato(lider.MedidoMm30 ?? 0)} Fica perto {perto}. Toque para ver no mapa.",
            Url: casa ? "/app?lugar=casa" : "/app?lugar=trabalho", Tag: ChuvaMedidaPerto);
    }

    /// <summary>
    /// Texto por pessoa: "perto da sua casa", "do seu trabalho" ou dos dois; uma ou duas regiões
    /// (casa primeiro). Toque abre o mapa na casa, ou no trabalho se só ele está no aviso.
    /// </summary>
    private static PushPayload PayloadChuvaComecou(IReadOnlyList<NotificacaoPendente> grupo, DestinatarioPush d)
    {
        var tipos = grupo.SelectMany(p => TiposDe(p, d)).ToHashSet();
        var casa = tipos.Contains(TipoLocal.CASA);
        var titulo = (casa, tipos.Contains(TipoLocal.TRABALHO)) switch
        {
            (true, true) => "Começou a chover perto da sua casa e do trabalho",
            (true, false) => "Começou a chover perto da sua casa",
            _ => "Começou a chover perto do seu trabalho",
        };

        var regioes = grupo
            .OrderBy(p => TiposDe(p, d).Contains(TipoLocal.CASA) ? 0 : 1)
            .Take(2)
            .Select(p => (Em: NomesSubprefeitura.ComPreposicao(p.Local), p.Intensidade, p.MedidoMm30))
            .ToList();
        var corpo = regioes.Count == 1
            ? $"Chuva {regioes[0].Intensidade} {regioes[0].Em} agora."
            : regioes[0].Intensidade == regioes[1].Intensidade
                ? $"Chuva {regioes[0].Intensidade} {regioes[0].Em} e {regioes[1].Em} agora."
                : $"Chuva {regioes[0].Intensidade} {regioes[0].Em} e {regioes[1].Intensidade} {regioes[1].Em} agora.";

        // O volume medido só entra com uma região: com duas, a frase não diz de qual é o número.
        if (regioes.Count == 1 && regioes[0].MedidoMm30 is { } mm)
            corpo += $" {GatilhoChuvaMedidaPerto.Fato(mm)}";

        return new PushPayload(titulo, corpo + " Toque para ver como está por lá.",
            Url: casa ? "/app?lugar=casa" : "/app?lugar=trabalho", Tag: ChuvaComecou);
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

    /// <summary>
    /// O aviso só sobe: Perigo (CGE) &gt; Chuva forte agora (score alto de alagamento) &gt; Vai chover.
    /// Depois de um nível, os de baixo ficam calados na subprefeitura por SilencioNivelAcimaHoras.
    /// Score alto de vento ou calor não cala a chuva prevista, e o Perigo não cala vento nem calor.
    /// </summary>
    private static bool SilenciadaPorNivelAcima(IReadOnlyList<EnvioAnterior> recentes, NotificacaoPendente p, DateTime agora)
    {
        var desde = agora.AddHours(-LimiaresNotificacao.SilencioNivelAcimaHoras);
        var naJanela = recentes.Where(r => r.SubprefeituraId == p.SubprefeituraId && r.EnviadoEm >= desde).ToList();
        bool houvePerigo = naJanela.Any(r => r.Gatilho == "alagamento-cge");

        return p.Gatilho switch
        {
            // O "começou a chover" cala pelo mesmo motivo: depois do alerta a pessoa já sabe.
            // A chuva prevista não cala ele, porque ele confirma que a chuva chegou.
            "chuva-prevista" or ChuvaComecou or ChuvaMedidaPerto => houvePerigo || naJanela.Any(r => r.Gatilho == "score-alto"
                && (PerigoDaChaveDeAlerta(r.Chave) is not { } perigo || perigo == TipoPerigo.ALAGAMENTO)),
            "score-alto" => p.Perigo == TipoPerigo.ALAGAMENTO && houvePerigo,
            _ => false,
        };
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
            "alagamento-cge" => ($"Alagamento em {lista} agora", "O CGE registrou pontos de alagamento. Toque para ver onde."),
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
