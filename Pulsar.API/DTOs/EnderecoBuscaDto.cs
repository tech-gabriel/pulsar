namespace Pulsar.API.DTOs;

/// <summary>
/// Um endereço encontrado pela busca de geocoding (item de autocomplete).
/// </summary>
public class EnderecoBuscaDto
{
    /// <summary>Descrição legível do endereço (ex.: "Avenida Paulista, Bela Vista, São Paulo").</summary>
    public string Descricao { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
