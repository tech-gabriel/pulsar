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

    /// <summary>
    /// True quando esta chamada criou a conta, em vez de autenticar uma já existente.
    /// Existe porque o login com Google cadastra de forma implícita: sem isso o
    /// frontend não consegue distinguir um cadastro novo de um retorno, e todo
    /// cadastro via Google ficaria invisível no funil de aquisição.
    /// </summary>
    [Description("True se a conta foi criada nesta chamada (cadastro implícito via Google).")]
    public bool NovoUsuario { get; set; }
}
