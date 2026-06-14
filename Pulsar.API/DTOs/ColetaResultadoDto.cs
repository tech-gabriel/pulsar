namespace Pulsar.API.DTOs;

/// <summary>Resultado de uma coleta manual disparada por um ADMIN.</summary>
public class ColetaResultadoDto
{
    public int SubprefeiturasProcessadas { get; set; }
    public int ScoresCalculados { get; set; }
    public int AlertasGerados { get; set; }
    public DateTime ConcluidoEm { get; set; }
}
