using System.ComponentModel.DataAnnotations;

namespace Pulsar.API.DTOs;

/// <summary>
/// Inscrição de Web Push enviada pelo navegador (PushSubscription.toJSON) mais
/// as preferências de faixa de risco escolhidas pelo usuário.
/// </summary>
public class AssinaturaPushRequestDto : IValidatableObject
{
    // O servidor faz POST neste endereço a cada alerta. Aceitar qualquer URL faria dele um
    // trampolim para a rede interna (SSRF), então só serviços de push dos navegadores.
    private static readonly string[] HostsExatos = ["fcm.googleapis.com", "android.googleapis.com", "web.push.apple.com"];
    private static readonly string[] SufixosDeHost = [".push.services.mozilla.com", ".notify.windows.com", ".push.apple.com"];

    [Required]
    [MaxLength(1000)]
    public string Endpoint { get; set; } = string.Empty;

    /// <summary>Chave pública P-256 (campo keys.p256dh da inscrição do navegador).</summary>
    [Required]
    [MaxLength(200)]
    public string P256dh { get; set; } = string.Empty;

    /// <summary>Segredo de autenticação (campo keys.auth da inscrição do navegador).</summary>
    [Required]
    [MaxLength(100)]
    public string Auth { get; set; } = string.Empty;

    public bool AlertaModerado { get; set; }
    public bool AlertaAlto { get; set; } = true;
    public bool ResumoDiario { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!EndpointDePushConhecido(Endpoint))
            yield return new ValidationResult("Endpoint de push inválido.", [nameof(Endpoint)]);
    }

    public static bool EndpointDePushConhecido(string endpoint)
    {
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || !uri.IsDefaultPort)
            return false;
        var host = uri.IdnHost.ToLowerInvariant();
        return HostsExatos.Contains(host) || SufixosDeHost.Any(host.EndsWith);
    }
}
