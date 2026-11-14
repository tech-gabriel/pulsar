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

    // Chuva medida (em conferência). Os campos acima usam a chuva de modelo da área; os de
    // baixo refazem a conta com a estação mais próxima de cada célula, por duas regras, para
    // decidir com números qual delas vale quando medida e modelo discordam.

    /// <summary>Células com estação válida por perto. As outras ficam com o modelo nas duas regras.</summary>
    public int CelulasComMedida { get; set; }

    /// <summary>Meio-termo com a regra "a medida substitui o modelo".</summary>
    public double ValorMeioTermoMedida { get; set; }
    public int CelulasAltoMedida { get; set; }

    /// <summary>Meio-termo com a regra "vale a maior das duas".</summary>
    public double ValorMeioTermoMaior { get; set; }
    public int CelulasAltoMaior { get; set; }

    /// <summary>Chuva de 3 h do modelo para a área, em mm.</summary>
    public double Chuva3hModeloMm { get; set; }

    /// <summary>Média da chuva de 3 h medida nas células com estação. Null = nenhuma célula com estação.</summary>
    public double? Chuva3hMedidaMm { get; set; }
    public DateTime CriadoEm { get; set; }
}
