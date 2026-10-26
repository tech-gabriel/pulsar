namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Ponto de alagamento publicado pelo CGE-SP. É o sinal mais forte que o Pulsar tem: não é
/// estimativa, é o órgão da cidade dizendo que a rua alagou. Dispara o aviso de Perigo e é
/// a verdade de campo para medir o acerto do score. Não se mistura com as ocorrências do
/// GeoSampa, que são histórico consolidado com outra semântica.
/// </summary>
public class PontoAlagamentoCge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;

    /// <summary>Dia local da página do CGE em que o ponto apareceu.</summary>
    public DateOnly Dia { get; set; }

    public string Via { get; set; } = string.Empty;
    public string Sentido { get; set; } = string.Empty;
    public string Referencia { get; set; } = string.Empty;

    /// <summary>Início em UTC (o CGE publica a hora local).</summary>
    public DateTime InicioUtc { get; set; }

    /// <summary>Fim em UTC; null enquanto o CGE não publicou o fim.</summary>
    public DateTime? FimUtc { get; set; }

    /// <summary>Ativo = alagado agora, segundo a última leitura da página.</summary>
    public bool Ativo { get; set; }

    public bool Transitavel { get; set; }

    /// <summary>
    /// Última vez que a página confirmou o ponto. Ativo com VistoEm velho não vale: se o CGE
    /// sai do ar, o ponto ficaria "ativo" para sempre e o Perigo gritaria sem motivo. Campo
    /// próprio porque o AtualizadoEm só muda quando algum valor muda.
    /// </summary>
    public DateTime VistoEm { get; set; }

    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
