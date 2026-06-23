using System.ComponentModel.DataAnnotations;

namespace Pulsar.API.DTOs;

public class GoogleLoginRequestDto
{
    /// <summary>ID token (JWT) emitido pelo Google Identity Services no frontend.</summary>
    [Required]
    public string IdToken { get; set; } = string.Empty;
}
