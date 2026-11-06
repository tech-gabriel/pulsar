using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

public class LocalSalvoDto
{
    public TipoLocal Tipo { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Rotulo { get; set; } = string.Empty;
    public Guid SubprefeituraId { get; set; }
    public string SubprefeituraNome { get; set; } = string.Empty;
}
