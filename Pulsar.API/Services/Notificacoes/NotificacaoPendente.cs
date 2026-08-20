using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Um push que um gatilho quer mandar. O motor decide se ele realmente sai.
///
/// Os dois modos de dedup:
/// - Cooldown null  => exatamente uma vez por Chave (chuva prevista, briefing).
/// - Cooldown setado => no máximo uma vez a cada Cooldown, janela DESLIZANTE (score alto).
///
/// Prioridade decide duas coisas, e não uma: quem ganha a vaga do ciclo e quem é isento do teto
/// diário. Ver <c>MotorNotificacoes.IsentaDoTetoDiario</c> antes de escolher o número.
/// </summary>
public record NotificacaoPendente(
    string Gatilho,
    string Chave,
    CriterioOptIn Criterio,
    PushPayload Payload,
    int Prioridade,
    TimeSpan? Cooldown = null);
