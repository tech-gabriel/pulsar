using System.ComponentModel;

namespace Pulsar.API.DTOs;

public class LoginResponseDto
{
    /// <summary>JWT Bearer token para autenticação nas rotas protegidas.</summary>
    /// <example>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</example>
    [Description("JWT Bearer token — inclua no header: Authorization: Bearer {token}")]
    public string Token { get; set; } = string.Empty;

    /// <summary>Dados do usuário autenticado.</summary>
    public UsuarioDto Usuario { get; set; } = null!;
}
