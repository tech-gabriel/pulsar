namespace Pulsar.API.Domain.Entities;

public class UsuarioRegiao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public Guid RegiaoId { get; set; }
    public Regiao Regiao { get; set; } = null!;
    public DateTime CriadoEm { get; set; }
}
