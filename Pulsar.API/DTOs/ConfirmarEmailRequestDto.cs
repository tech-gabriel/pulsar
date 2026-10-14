using System.ComponentModel.DataAnnotations;

namespace Pulsar.API.DTOs;

public class ConfirmarEmailRequestDto
{
    [Required]
    public string Token { get; set; } = string.Empty;
}
