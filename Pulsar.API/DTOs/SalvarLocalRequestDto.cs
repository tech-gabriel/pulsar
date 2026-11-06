namespace Pulsar.API.DTOs;

public class SalvarLocalRequestDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Rotulo { get; set; } = string.Empty;
    public Guid SubprefeituraId { get; set; }
}
