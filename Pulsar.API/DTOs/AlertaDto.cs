using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

public class AlertaDto
{
    public Guid Id { get; set; }
    public string RegiaoNome { get; set; } = string.Empty;
    public double ScoreValor { get; set; }
    public FaixaRisco Faixa { get; set; }
    public string Mensagem { get; set; } = string.Empty;
    public IList<SugestaoDto> Sugestoes { get; set; } = new List<SugestaoDto>();
    public DateTime Timestamp { get; set; }
}
