namespace Pulsar.API.DTOs;

/// <summary>
/// Um endereço encontrado pela busca de geocoding (item de autocomplete).
/// </summary>
public class EnderecoBuscaDto
{
    /// <summary>Rótulo principal do resultado (ex.: "Shopping Eldorado", "Avenida Paulista").</summary>
    public string Nome { get; set; } = string.Empty;

    /// <summary>Descrição completa/contexto (ex.: "Shopping Eldorado, Avenida Rebouças 3970, São Paulo").</summary>
    public string Descricao { get; set; } = string.Empty;

    /// <summary>Categoria do provedor: "poi", "address", "place", "neighbourhood"…</summary>
    public string Tipo { get; set; } = string.Empty;

    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
