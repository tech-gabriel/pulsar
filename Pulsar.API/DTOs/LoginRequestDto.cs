using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Pulsar.API.DTOs;

public class LoginRequestDto
{
    /// <summary>E-mail cadastrado na plataforma.</summary>
    /// <example>usuario@exemplo.com</example>
    [Required]
    [EmailAddress]
    [Description("E-mail cadastrado na plataforma")]
    [DefaultValue("usuario@exemplo.com")]
    public string Email { get; set; } = string.Empty;

    /// <summary>Senha da conta (mínimo 8 caracteres).</summary>
    /// <example>Senha@123</example>
    [Required]
    [Description("Senha da conta")]
    [DefaultValue("Senha@123")]
    public string Senha { get; set; } = string.Empty;
}
