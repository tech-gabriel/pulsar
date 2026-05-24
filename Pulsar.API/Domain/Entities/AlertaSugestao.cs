namespace Pulsar.API.Domain.Entities;

public class AlertaSugestao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AlertaId { get; set; }
    public Alerta Alerta { get; set; } = null!;
    public Guid SugestaoId { get; set; }
    public Sugestao Sugestao { get; set; } = null!;
    public int Ordem { get; set; }
}
