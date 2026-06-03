using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Pulsar.API.DTOs;

/// <summary>Redefinição de senha com o token recebido por e-mail.</summary>
public class RedefinirSenhaRequestDto
{
    [Required]
    [Description("Token recebido no link do e-mail de recuperação")]
    public string Token { get; set; } = string.Empty;

    [Required]
    [Description("Nova senha: mínimo 8 chars, 2 números e 1 especial")]
    public string NovaSenha { get; set; } = string.Empty;
}
