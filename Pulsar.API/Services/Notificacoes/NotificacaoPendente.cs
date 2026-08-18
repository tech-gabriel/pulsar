using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Um push que um gatilho quer mandar. O motor decide se ele realmente sai.
///
/// Os dois modos de dedup:
/// - Cooldown null  => exatamente uma vez por Chave (chuva prevista, briefing).
/// - Cooldown setado => no máximo uma vez a cada Cooldown, janela DESLIZANTE (score alto).
/// </summary>
public record NotificacaoPendente(
    string Gatilho,
    string Chave,
    CriterioOptIn Criterio,
    PushPayload Payload,
    int Prioridade,
    TimeSpan? Cooldown = null);
