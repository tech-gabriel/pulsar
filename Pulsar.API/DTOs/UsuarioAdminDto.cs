using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>Representa um usuário na listagem administrativa.</summary>
public class UsuarioAdminDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public TipoPerfil Perfil { get; set; }
    public RoleAcesso Role { get; set; }
    public bool Ativo { get; set; }
    public DateTime CriadoEm { get; set; }
}
