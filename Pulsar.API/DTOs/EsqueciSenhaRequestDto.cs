using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Pulsar.API.DTOs;

/// <summary>Solicitação de recuperação de senha: dispara o envio do link por e-mail.</summary>
public class EsqueciSenhaRequestDto
{
    [Required]
    [EmailAddress]
    [MaxLength(200)]
    [Description("E-mail da conta a recuperar")]
    public string Email { get; set; } = string.Empty;
}
