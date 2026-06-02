using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>
/// Atualização do perfil do usuário. A troca de senha é opcional: só ocorre se
/// <see cref="NovaSenha"/> for informada, exigindo <see cref="SenhaAtual"/> correta.
/// </summary>
public class AtualizarPerfilRequestDto
{
    [Required]
    [MaxLength(200)]
    [Description("Nome completo do usuário")]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(200)]
    [Description("E-mail único do usuário")]
    public string Email { get; set; } = string.Empty;

    [Description("Persona do usuário para personalização")]
    public TipoPerfil Perfil { get; set; } = TipoPerfil.CIDADAO;

    /// <summary>Senha atual — obrigatória apenas ao trocar a senha.</summary>
    [Description("Senha atual (necessária para trocar a senha)")]
    public string? SenhaAtual { get; set; }

    /// <summary>Nova senha — opcional. Se informada, segue as mesmas regras do cadastro.</summary>
    [Description("Nova senha: mínimo 8 chars, 2 números e 1 especial")]
    public string? NovaSenha { get; set; }
}
