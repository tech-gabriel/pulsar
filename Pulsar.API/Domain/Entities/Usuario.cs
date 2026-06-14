using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string SenhaHash { get; set; } = string.Empty;
    public TipoPerfil Perfil { get; set; } = TipoPerfil.CIDADAO;

    /// <summary>Papel de acesso/autorização. Atribuído pelo servidor (ver <see cref="RoleAcesso"/>).</summary>
    public RoleAcesso Role { get; set; } = RoleAcesso.USUARIO;

    /// <summary>Conta ativa. Quando false, o login é bloqueado.</summary>
    public bool Ativo { get; set; } = true;

    public IList<UsuarioRegiao> Favoritos { get; set; } = new List<UsuarioRegiao>();
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
