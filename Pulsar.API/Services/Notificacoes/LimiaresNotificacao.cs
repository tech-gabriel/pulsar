using System.Globalization;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Todos os números que decidem se um push sai, num lugar só: os limiares que cada gatilho
/// lê, os que o motor aplica depois deles (prioridade, teto diário) e os que definem quanto
/// o motor enxerga e por quanto tempo lembra do que já enviou.
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

    /// <summary>
    /// Lookahead do aviso de chuva: só olhamos faixas que caem DENTRO das próximas 12h.
    /// Chuva prevista para depois disso não é acionável hoje e vira ruído.
    /// </summary>
    public const int JanelaPrevisaoHoras = 12;

    /// <summary>Hora local a partir da qual o briefing do dia pode sair.</summary>
    public const int HoraBriefingLocal = 6;

    /// <summary>
    /// Hora local a partir da qual o briefing do dia deixa de sair (exclusiva). A manhã
    /// acaba ao meio-dia, e as 6h de folga entre os dois limites são tolerância generosa
    /// para o serviço voltar de uma queda. Resumo do dia que chega à tarde já não é resumo
    /// do dia: quem ia decidir se levava guarda-chuva já saiu de casa.
    /// </summary>
    public const int HoraLimiteBriefingLocal = 12;

    /// <summary>
    /// Horizonte do resumo diário. Maior que o do aviso de chuva de propósito: o briefing
    /// é o "como vai ser o seu dia", então precisa alcançar a noite de quem lê às 6h da
    /// manhã, enquanto o aviso de chuva existe para ser acionável agora.
    /// </summary>
    public const int JanelaBriefingHoras = 24;

    /// <summary>Rede de segurança contra tarde caótica em que a previsão muda de hora em hora.</summary>
    public const int MaxPushPorRegiaoPorDia = 3;

    /// <summary>Cooldown deslizante do aviso de risco alto. Preserva o comportamento anterior.</summary>
    public static readonly TimeSpan CooldownScoreAlto = TimeSpan.FromHours(1);

    /// <summary>Janela consultada para contar o teto diário. Precisa cobrir qualquer fuso com folga.</summary>
    public const int JanelaTetoDiarioHoras = 48;

    /// <summary>
    /// Passo da previsão do provedor, em horas. O plano grátis do OpenWeatherMap não entrega
    /// previsão horária, só de 3 em 3. Ver o doc de <see cref="GatilhoChuvaPrevista"/>.
    /// </summary>
    public const int HorasPorFaixaPrevisao = 3;

    /// <summary>
    /// Quantas faixas de previsão o motor carrega no contexto de cada região. Derivado do
    /// horizonte do briefing porque ele é o maior dos dois consumidores: carregar menos
    /// truncaria o resumo do dia em silêncio, e a frase "sem chuva prevista nas próximas
    /// horas" passaria a afirmar sobre menos horas do que promete. Carregar mais seria
    /// linha de banco que nenhum gatilho lê.
    /// </summary>
    public const int MaxFaixasContexto = JanelaBriefingHoras / HorasPorFaixaPrevisao;

    /// <summary>
    /// Por quantos dias o livro-caixa guarda o que já saiu. Precisa cobrir com folga a maior
    /// janela de dedup em uso (um dia local, do briefing): encurtar isto abaixo de uma janela
    /// de dedup faria a chave esquecida voltar a notificar. A folga que sobra é para
    /// diagnóstico, e é o limite em si que impede a tabela de crescer para sempre.
    /// </summary>
    public const int RetencaoLivroCaixaDias = 30;

    // Menor número = maior prioridade. Quando mais de um gatilho dispara no mesmo
    // ciclo, sai só o de maior prioridade ENTRE OS QUE AINDA NÃO SAÍRAM: avisar que
    // vai chover às 18h enquanto está chovendo forte agora é ruído, mas repetir o
    // aviso de agora, que o dedup já barrou, não pode calar o de 18h. Ver o doc de
    // MotorNotificacoes.EscolherAsync.
    public const int PrioridadeScoreAlto = 1;
    public const int PrioridadeChuvaPrevista = 2;
    public const int PrioridadeBriefing = 3;

    /// <summary>
    /// Cultura em que os números da copy são escritos. Está amarrada ao IDIOMA do texto,
    /// que é português escrito à mão aqui dentro, e não ao fuso da região: são regras
    /// diferentes e não devem ser confundidas. O fuso é dado da Regiao porque muda quando
    /// entra outra cidade; a cultura acompanha a frase e só muda se a copy for traduzida.
    ///
    /// Explícita porque o host não define cultura nenhuma: no container o padrão é
    /// invariante e "12,4 mm" sairia como "12.4 mm" no meio de uma frase em português.
    /// Push é justamente o lugar onde o leitor não volta para conferir.
    /// </summary>
    public static readonly CultureInfo CulturaCopy = CultureInfo.GetCultureInfo("pt-BR");

    /// <summary>Rótulo da região para copy. "região Centro" e "região Sul" funcionam; "zona Centro" não.</summary>
    public static string Rotulo(string nomeRegiao) => $"região {nomeRegiao}";
}
