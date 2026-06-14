namespace Pulsar.API.DTOs;

/// <summary>Métricas agregadas do sistema para a área administrativa.</summary>
public class MetricasDto
{
    public int TotalUsuarios { get; set; }
    public int UsuariosAtivos { get; set; }
    public int Admins { get; set; }
    public int Suportes { get; set; }
    public int TotalSugestoes { get; set; }
    public int SugestoesAtivas { get; set; }
    public int AlertasUltimas24h { get; set; }
    public int LeiturasUltimas24h { get; set; }
}
