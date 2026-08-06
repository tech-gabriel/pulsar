namespace Pulsar.API.DTOs;

/// <summary>Resumo das ocorrências perto de um ponto + sinal de risco atual.</summary>
public class OcorrenciasProximasDto
{
    public int Total { get; set; }
    public int Alagamentos { get; set; }
    public int Inundacoes { get; set; }
    public double? MaisProximaMetros { get; set; }
    /// <summary>True quando há ocorrência no raio E chuva atual acima do limiar.</summary>
    public bool RiscoElevado { get; set; }
    public double? ChuvaMmH { get; set; }
}
