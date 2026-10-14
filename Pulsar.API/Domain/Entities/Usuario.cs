using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Entities;

public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string SenhaHash { get; set; } = string.Empty;
    public TipoPerfil Perfil { get; set; } = TipoPerfil.CIDADAO;

    /// <summary>Papel de acesso/autorização. Atribuído pelo servidor (ver <see cref="RoleAcesso"/>).</summary>
    public RoleAcesso Role { get; set; } = RoleAcesso.USUARIO;

    /// <summary>Conta ativa. Quando false, o login é bloqueado.</summary>
    public bool Ativo { get; set; } = true;

    /// <summary>A pessoa provou que recebe e-mail em <see cref="Email"/> (link de confirmação, Google ou reset).</summary>
    public bool EmailVerificado { get; set; }

    /// <summary>E-mail novo pedido no perfil, aguardando o clique no link. <see cref="Email"/> só muda na confirmação.</summary>
    public string? EmailPendente { get; set; }

    /// <summary>
    /// Carimbo de segurança (SEC2): vai no JWT como claim <c>carimbo</c>. Trocar o carimbo invalida
    /// todos os tokens já emitidos para a conta. Só muda por <see cref="RenovarCarimbo"/>.
    /// </summary>
    public string CarimboSeguranca { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>Derruba todas as sessões da conta: tokens com o carimbo antigo passam a receber 401.</summary>
    public void RenovarCarimbo() => CarimboSeguranca = Guid.NewGuid().ToString("N");

    public IList<UsuarioSubprefeitura> Favoritos { get; set; } = new List<UsuarioSubprefeitura>();
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }

    /// <summary>Forma canônica do e-mail (sem espaços nas pontas, minúsculas): a única que se grava e se busca.</summary>
    public static string NormalizarEmail(string email) => email.Trim().ToLowerInvariant();
}
