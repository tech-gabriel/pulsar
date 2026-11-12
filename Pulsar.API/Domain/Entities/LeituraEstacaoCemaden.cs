namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Chuva acumulada de uma estação do CEMADEN, uma linha por estação por ciclo. É dado MEDIDO,
/// como a <see cref="LeituraEstacaoCge"/>, mas já vem por janela (1 h a 120 h): janela null = a
/// estação não mandou dado naquela janela, o que é diferente de zero. Sem retenção por enquanto:
/// cerca de 6 mil linhas por dia por município do porte da capital.
/// </summary>
public class LeituraEstacaoCemaden
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string CodEstacao { get; set; } = string.Empty;

    /// <summary>
    /// Instante da consulta no CEMADEN, em UTC. É igual para todas as estações da resposta: não
    /// é o horário em que a estação mediu.
    /// </summary>
    public DateTime DataHora { get; set; }

    /// <summary>Horário do NOSSO ciclo de coleta, em UTC.</summary>
    public DateTime ColetadoEm { get; set; }

    public double? Acc1h { get; set; }
    public double? Acc3h { get; set; }
    public double? Acc6h { get; set; }
    public double? Acc12h { get; set; }
    public double? Acc24h { get; set; }
    public double? Acc48h { get; set; }
    public double? Acc72h { get; set; }
    public double? Acc96h { get; set; }
    public double? Acc120h { get; set; }
}
