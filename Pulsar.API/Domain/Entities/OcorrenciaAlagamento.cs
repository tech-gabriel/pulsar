using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Ocorrência real de alagamento/inundação registrada pela Defesa Civil (SIGRC),
/// ingerida do WFS do GeoSampa. Coordenadas em WGS84.
/// </summary>
public class OcorrenciaAlagamento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string CdIdentificador { get; set; } = string.Empty;
    public TipoOcorrenciaAlagamento Tipo { get; set; }
    public DateTime DataOcorrencia { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? NmSubprefeitura { get; set; }
    public string FonteOriginal { get; set; } = string.Empty;
    public DateTime DataCarga { get; set; }
    public DateTime CriadoEm { get; set; }
}
