namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Token de uso único que confirma a posse de um e-mail. Como o de reset, guarda só o hash (SHA-256).
/// Tabela separada da de reset de propósito: um tipo de token nunca pode valer pelo outro.
/// </summary>
public class TokenVerificacaoEmail
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    public string TokenHash { get; set; } = string.Empty;

    /// <summary>Endereço que este token confirma (o atual ou o pendente), na forma canônica.</summary>
    public string Email { get; set; } = string.Empty;

    public DateTime ExpiraEm { get; set; }
    public DateTime? UsadoEm { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
