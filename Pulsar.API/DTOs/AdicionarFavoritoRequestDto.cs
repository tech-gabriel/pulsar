using System.ComponentModel.DataAnnotations;

namespace Pulsar.API.DTOs;

public class AdicionarFavoritoRequestDto
{
    [Required]
    public Guid RegiaoId { get; set; }
}
