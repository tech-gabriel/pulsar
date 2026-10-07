namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Registro de que uma PESSOA foi avisada de um evento de uma subprefeitura. É o livro-caixa do dedup: sem ele, um período
/// sustentado de risco viraria um push a cada ciclo de 15 min.
/// </summary>
/// <remarks>
/// Tabela própria porque nem o briefing diário nem a chuva prevista nascem de um score.
/// O antigo histórico de alertas (tabela Alertas) saiu na 1.14.0: o livro-caixa é o
/// único registro do que foi avisado.
/// </remarks>
public class NotificacaoEnviada
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;
    /// <summary>Agrupa as linhas de um mesmo push consolidado. O teto diário conta EnvioId distintos.</summary>
    public Guid EnvioId { get; set; }
    /// <summary>Nome do gatilho: "score-alto", "chuva-prevista" ou "briefing-diario".</summary>
    public string Gatilho { get; set; } = string.Empty;
    /// <summary>Chave de idempotência do evento. Única por pessoa.</summary>
    public string Chave { get; set; } = string.Empty;
    /// <summary>Instante do envio, sempre Kind.Utc (o Npgsql recusa outro Kind).</summary>
    public DateTime EnviadoEm { get; set; }
}
