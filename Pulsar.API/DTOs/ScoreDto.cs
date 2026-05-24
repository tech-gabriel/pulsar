using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

public class ScoreDto
{
    public double Valor { get; set; }
    public FaixaRisco Faixa { get; set; }
    public DateTime Timestamp { get; set; }
}
