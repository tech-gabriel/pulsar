using System.ComponentModel.DataAnnotations;

namespace Pulsar.API.DTOs;

/// <summary>
/// Inscrição de Web Push enviada pelo navegador (PushSubscription.toJSON) mais
/// as preferências de faixa de risco escolhidas pelo usuário.
/// </summary>
public class AssinaturaPushRequestDto
{
    [Required]
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>Chave pública P-256 (campo keys.p256dh da inscrição do navegador).</summary>
    [Required]
    public string P256dh { get; set; } = string.Empty;

    /// <summary>Segredo de autenticação (campo keys.auth da inscrição do navegador).</summary>
    [Required]
    public string Auth { get; set; } = string.Empty;

    public bool AlertaModerado { get; set; }
    public bool AlertaAlto { get; set; } = true;
    public bool ResumoDiario { get; set; }
}
