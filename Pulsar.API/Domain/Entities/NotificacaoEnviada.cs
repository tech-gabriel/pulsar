namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Registro de um push que saiu. É o livro-caixa do dedup: sem ele, um período
/// sustentado de risco viraria um push a cada ciclo de 15 min.
/// </summary>
/// <remarks>
/// Tabela própria em vez de reaproveitar a <see cref="Alerta"/>: a Alerta tem FK
/// não-nulável para o score, e nem o briefing diário nem a chuva prevista nascem
/// de um score. A Alerta segue sendo o histórico de risco alto.
/// </remarks>
public class NotificacaoEnviada
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RegiaoId { get; set; }
    public Regiao Regiao { get; set; } = null!;

    /// <summary>Nome do gatilho: "score-alto", "chuva-prevista" ou "briefing-diario".</summary>
    public string Gatilho { get; set; } = string.Empty;

    /// <summary>Chave de idempotência do evento. Única na tabela.</summary>
    public string Chave { get; set; } = string.Empty;

    /// <summary>
    /// Instante do envio, sempre em UTC. Quem grava é responsável por entregar
    /// <c>Kind.Utc</c>: o Npgsql recusa qualquer outro Kind nesta coluna, e o dia
    /// local que o teto diário precisa é calculado fora daqui, pelo fuso da região.
    /// </summary>
    public DateTime EnviadoEm { get; set; }

    /// <summary>Quantos push saíram. Zero é informação: ninguém opt-in para este critério.</summary>
    public int Destinatarios { get; set; }
}
