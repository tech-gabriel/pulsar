namespace Pulsar.API.Domain.Enums;

/// <summary>
/// Papel de acesso (autorização real) do usuário no sistema. Diferente de
/// <see cref="TipoPerfil"/>, que é apenas persona de UX e NÃO concede privilégios.
/// A role é atribuída pelo servidor (bootstrap por configuração ou por um ADMIN),
/// nunca auto-selecionada pelo usuário no cadastro.
/// </summary>
public enum RoleAcesso
{
    /// <summary>Usuário comum: acesso às funcionalidades públicas autenticadas.</summary>
    USUARIO,

    /// <summary>Suporte: acesso somente leitura aos painéis administrativos.</summary>
    SUPORTE,

    /// <summary>Administrador: acesso total, incluindo ações de escrita.</summary>
    ADMIN
}
