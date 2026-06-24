namespace Pulsar.API.DTOs;

/// <summary>Chave pública VAPID e estado do recurso de push, consumidos pelo frontend.</summary>
public class VapidPublicKeyDto
{
    /// <summary>True quando o servidor tem chaves VAPID e aceita inscrições.</summary>
    public bool Habilitado { get; set; }

    /// <summary>Chave pública (Base64 URL-safe) para a inscrição no navegador. Null se desativado.</summary>
    public string? ChavePublica { get; set; }
}
