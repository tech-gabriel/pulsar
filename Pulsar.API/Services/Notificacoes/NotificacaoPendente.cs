using Pulsar.API.Domain.Enums;
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
///
/// SubprefeituraId e Local dizem de onde veio o evento: o consolidador cruza com as favoritas
/// da pessoa e usa o nome no texto de várias subprefeituras.
///
/// Perigo diz de qual perigo é o evento; o consolidador usa no silêncio da Atenção.
///
/// MedidoMm30 e LocalMedicao carregam a chuva medida por posto do CGE-SP (AS7): quanto choveu em
/// 30 minutos e em que subprefeitura fica o posto. O consolidador monta o texto com eles.
///
/// Celula é o trecho (índice H3) do aviso de alagamento no lugar: o consolidador entrega só a
/// quem tem casa ou trabalho naquele trecho.
/// </summary>
public record NotificacaoPendente(
    string Gatilho,
    string Chave,
    CriterioOptIn Criterio,
    PushPayload Payload,
    int Prioridade,
    TimeSpan? Cooldown = null,
    Guid SubprefeituraId = default,
    string Local = "",
    TipoPerigo? Perigo = null,
    string? Intensidade = null,
    double? MedidoMm30 = null,
    string? LocalMedicao = null,
    string? Celula = null,
    // Nível do alerta oficial (1 Moderado, 2 Severo, 3 Extremo; 0 nos outros gatilhos): no
    // cooldown, um envio de nível menor não cobre um de nível maior (subir de nível avisa na hora).
    int Nivel = 0,
    // Alerta oficial: o texto curto de lembrete ("segue valendo ... até 16:30"). O consolidador o usa
    // quando a pessoa já foi avisada desse tipo de alerta na área, no mesmo nível ou acima, antes das 3 h.
    PushPayload? Lembrete = null);
