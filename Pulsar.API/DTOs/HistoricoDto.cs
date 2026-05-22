namespace Pulsar.API.DTOs;

public class HistoricoDto
{
    public string SubprefeituraNome { get; set; } = string.Empty;
    public IList<LeituraComScoreDto> Leituras { get; set; } = new List<LeituraComScoreDto>();
}
