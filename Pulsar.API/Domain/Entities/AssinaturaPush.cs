namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Inscrição de Web Push de um dispositivo/navegador do usuário. Guarda o
/// endpoint e as chaves geradas pelo navegador (Push API) mais as preferências
/// de quais faixas de risco devem disparar notificação. Um usuário pode ter
/// várias (um registro por navegador/dispositivo), identificadas pelo Endpoint.
/// </summary>
public class AssinaturaPush
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    /// <summary>URL única do serviço de push do navegador. Identifica a inscrição.</summary>
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>Chave pública do cliente (P-256 ECDH) usada na criptografia do payload.</summary>
    public string P256dh { get; set; } = string.Empty;

    /// <summary>Segredo de autenticação do cliente, parte da criptografia do payload.</summary>
    public string Auth { get; set; } = string.Empty;

    /// <summary>Avisar quando o risco atingir faixa Moderado (ou acima).</summary>
    public bool AlertaModerado { get; set; }

    /// <summary>Avisar quando o risco atingir faixa Alto.</summary>
    public bool AlertaAlto { get; set; } = true;

    /// <summary>Receber um resumo diário das condições.</summary>
    public bool ResumoDiario { get; set; }

    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
