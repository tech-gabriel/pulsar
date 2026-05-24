namespace Pulsar.API.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string SenhaHash { get; set; } = string.Empty;
    public IList<UsuarioRegiao> Favoritos { get; set; } = new List<UsuarioRegiao>();
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
