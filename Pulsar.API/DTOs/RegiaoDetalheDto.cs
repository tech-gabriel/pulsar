using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

public class RegiaoDetalheDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public double ScoreAgregado { get; set; }
    public FaixaRisco FaixaRisco { get; set; }
    public int TotalSubprefeituras { get; set; }
    public DateTime UltimaAtualizacao { get; set; }
    public IList<SubprefeituraDto> Subprefeituras { get; set; } = new List<SubprefeituraDto>();
}
