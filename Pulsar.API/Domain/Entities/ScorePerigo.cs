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
    public double Chuva3hMm { get; set; }
    public double Chuva48hMm { get; set; }
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
