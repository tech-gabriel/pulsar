namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Todos os números que decidem se um push sai, num lugar só.
///
/// Os limiares de chuva e probabilidade são PONTO DE PARTIDA CALIBRÁVEL, não verdade
/// meteorológica: foram escolhidos para não gritar por garoa e devem ser recalibrados
/// contra dias de chuva reais (frentes N1 e N2 do backlog).
/// </summary>
public static class LimiaresNotificacao
{
    /// <summary>Chuva na faixa de 3h que caracteriza chuva forte prevista, em mm.</summary>
    public const double ChuvaFortePrevistaMm = 10.0;

    /// <summary>Acima disto a severidade sobe de moderado para alto, em mm.</summary>
    public const double ChuvaMuitoFortePrevistaMm = 20.0;

    /// <summary>Probabilidade mínima (0 a 1) para o aviso de chuva valer.</summary>
    public const double ProbabilidadeMinima = 0.6;

    /// <summary>Só avisamos de chuva desta janela para frente. Depois de amanhã não é acionável.</summary>
    public const int JanelaPrevisaoHoras = 12;

    /// <summary>Hora local a partir da qual o briefing do dia pode sair.</summary>
    public const int HoraBriefingLocal = 6;

    /// <summary>Rede de segurança contra tarde caótica em que a previsão muda de hora em hora.</summary>
    public const int MaxPushPorRegiaoPorDia = 3;

    /// <summary>Cooldown deslizante do aviso de risco alto. Preserva o comportamento anterior.</summary>
    public static readonly TimeSpan CooldownScoreAlto = TimeSpan.FromHours(1);

    /// <summary>Janela consultada para contar o teto diário. Precisa cobrir qualquer fuso com folga.</summary>
    public const int JanelaTetoDiarioHoras = 48;

    // Menor número = maior prioridade. Quando mais de um gatilho dispara no mesmo
    // ciclo, sai só o de maior prioridade: avisar que vai chover às 18h enquanto
    // está chovendo forte agora é ruído.
    public const int PrioridadeScoreAlto = 1;
    public const int PrioridadeChuvaPrevista = 2;
    public const int PrioridadeBriefing = 3;

    /// <summary>Rótulo da região para copy. "região Centro" e "região Sul" funcionam; "zona Centro" não.</summary>
    public static string Rotulo(string nomeRegiao) => $"região {nomeRegiao}";
}
