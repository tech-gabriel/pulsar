namespace Pulsar.API.Domain.Entities;

public class Alerta
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RegiaoId { get; set; }
    public Regiao Regiao { get; set; } = null!;
    public Guid ScoreId { get; set; }
    public ScorePerigo Score { get; set; } = null!;
    public string Mensagem { get; set; } = string.Empty;
    public IList<AlertaSugestao> AlertaSugestoes { get; set; } = new List<AlertaSugestao>();
    public DateTime Timestamp { get; set; }
    public DateTime CriadoEm { get; set; }
}
