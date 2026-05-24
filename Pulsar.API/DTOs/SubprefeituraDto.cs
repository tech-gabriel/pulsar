using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

public class SubprefeituraDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public ScoreDto? ScoreAtual { get; set; }
    public FaixaRisco FaixaRisco { get; set; }
    public LeituraDto? UltimaLeitura { get; set; }
}
