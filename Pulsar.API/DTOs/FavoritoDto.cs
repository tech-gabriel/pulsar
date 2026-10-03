namespace Pulsar.API.DTOs;

public class FavoritoDto
{
    public Guid SubprefeituraId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public Guid RegiaoId { get; set; }
    public string RegiaoNome { get; set; } = string.Empty;
}
