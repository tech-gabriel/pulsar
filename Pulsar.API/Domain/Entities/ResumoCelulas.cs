using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Retrato de um ciclo: o risco de alagamento das células de uma área, resumido. Existe
/// para comparar o cálculo por trecho com o cálculo atual da área antes de mostrar o
/// primeiro a alguém. Não guarda célula por célula (seriam quase 200 mil linhas por dia).
/// </summary>
public class ResumoCelulas
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;

    /// <summary>Instante da última leitura de clima usada na conta (UTC).</summary>
    public DateTime Timestamp { get; set; }

    /// <summary>Alagamento da área pelo cálculo atual (o que o app mostra hoje).</summary>
    public double ValorArea { get; set; }

    /// <summary>Alagamento da área pelo meio-termo das células (o candidato a substituir o atual).</summary>
    public double ValorMeioTermo { get; set; }
    public FaixaRisco FaixaMeioTermo { get; set; }

    public double ValorMaximo { get; set; }
    public int Celulas { get; set; }
    public int CelulasModerado { get; set; }
    public int CelulasAlto { get; set; }
    public DateTime CriadoEm { get; set; }
}
