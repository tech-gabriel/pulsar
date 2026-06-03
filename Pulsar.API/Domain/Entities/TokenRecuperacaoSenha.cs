namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Token de uso único para recuperação de senha. Por segurança, NUNCA armazena o
/// token em texto puro — guarda apenas o hash (SHA-256). O token bruto é enviado
/// somente no link do e-mail.
/// </summary>
public class TokenRecuperacaoSenha
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    /// <summary>Hash SHA-256 (hex) do token enviado por e-mail.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiraEm { get; set; }

    /// <summary>Momento em que o token foi consumido. Null = ainda válido.</summary>
    public DateTime? UsadoEm { get; set; }

    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
