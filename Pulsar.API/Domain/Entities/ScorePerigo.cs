using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Score de uma leitura. Valor/Faixa são o PRINCIPAL (o pior dos três perigos), então
/// mapa, rollup, histórico e gatilhos seguem lendo os mesmos campos. Os componentes e as
/// entradas (acumulados) ficam ao lado para explicar o número e para recalibrar.
/// </summary>
public class ScorePerigo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;
    public Guid LeituraId { get; set; }
    public LeituraClimatica Leitura { get; set; } = null!;
    public double Valor { get; set; }
    public FaixaRisco Faixa { get; set; }
    public TipoPerigo PerigoPrincipal { get; set; }
    public double ValorAlagamento { get; set; }
    public FaixaRisco FaixaAlagamento { get; set; }
    public double ValorVento { get; set; }
    public FaixaRisco FaixaVento { get; set; }
    public double ValorCalor { get; set; }
    public FaixaRisco FaixaCalor { get; set; }
    /// <summary>Chuva de 3 h do modelo para a área (a mesma de sempre, guardada para recalibrar).</summary>
    public double Chuva3hMm { get; set; }
    public double Chuva48hMm { get; set; }

    /// <summary>
    /// Chuva de 3 h MEDIDA pelas estações dos trechos que fizeram o alagamento da área ("a medida
    /// manda"). Null quando o número saiu do modelo, ou em score anterior a esta conta.
    /// </summary>
    public double? Chuva3hMedidaMm { get; set; }

    /// <summary>Posto do CGE quando foi ele (e não as estações dos trechos) que fez o alagamento.</summary>
    [System.ComponentModel.DataAnnotations.MaxLength(80)]
    public string? PostoChuvaMedida { get; set; }

    /// <summary>A chuva de 3 h que explica o alagamento: a medida quando foi ela que fez o número.</summary>
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public double Chuva3hDoAlagamentoMm => Chuva3hMedidaMm ?? Chuva3hMm;
    public DateTime Timestamp { get; set; }
    public DateTime CriadoEm { get; set; }

    public void Aplicar(ResultadoScore r)
    {
        ValorAlagamento = r.Alagamento.Valor; FaixaAlagamento = r.Alagamento.Faixa;
        ValorVento = r.Vento.Valor; FaixaVento = r.Vento.Faixa;
        ValorCalor = r.Calor.Valor; FaixaCalor = r.Calor.Faixa;
        PerigoPrincipal = r.Principal;
        Valor = r.DoPrincipal.Valor;
        Faixa = r.DoPrincipal.Faixa;
    }
}
