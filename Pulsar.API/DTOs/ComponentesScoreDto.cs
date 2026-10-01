using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

public class ComponenteScoreDto
{
    public double Valor { get; set; }
    public FaixaRisco Faixa { get; set; }
}

public class ComponentesScoreDto
{
    public ComponenteScoreDto Alagamento { get; set; } = new();
    public ComponenteScoreDto Vento { get; set; } = new();
    public ComponenteScoreDto Calor { get; set; } = new();
}
