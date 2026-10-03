namespace Pulsar.API.Domain.Entities;

/// <summary>Subprefeitura que a pessoa acompanha. É por ela que o push chega.</summary>
public class UsuarioSubprefeitura
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;
    public DateTime CriadoEm { get; set; }
}
