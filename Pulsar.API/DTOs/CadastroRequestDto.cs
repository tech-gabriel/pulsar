using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Pulsar.API.DTOs;

public class CadastroRequestDto
{
    /// <summary>Nome completo do usuário.</summary>
    /// <example>Maria Silva</example>
    [Required]
    [MaxLength(200)]
    [Description("Nome completo do usuário")]
    [DefaultValue("Maria Silva")]
    public string Nome { get; set; } = string.Empty;

    /// <summary>E-mail único do usuário.</summary>
    /// <example>maria@exemplo.com</example>
    [Required]
    [EmailAddress]
    [MaxLength(200)]
    [Description("E-mail único do usuário")]
    [DefaultValue("maria@exemplo.com")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Senha: mínimo 8 caracteres, 2 dígitos numéricos e 1 caractere especial.
    /// </summary>
    /// <example>Senha@123</example>
    [Required]
    [MinLength(8)]
    [Description("Senha com mínimo 8 chars, 2 números e 1 especial")]
    [DefaultValue("Senha@123")]
    public string Senha { get; set; } = string.Empty;
}
