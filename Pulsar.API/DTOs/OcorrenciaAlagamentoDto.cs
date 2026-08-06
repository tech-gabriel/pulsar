using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

public class OcorrenciaAlagamentoDto
{
    public Guid Id { get; set; }
    public TipoOcorrenciaAlagamento Tipo { get; set; }
    public DateTime DataOcorrencia { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? NmSubprefeitura { get; set; }
}
