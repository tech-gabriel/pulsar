namespace Pulsar.API.DTOs;

public class AgregadoDiarioDto
{
    public DateOnly Dia { get; set; }
    public string Subprefeitura { get; set; } = string.Empty;
    public string Regiao { get; set; } = string.Empty;
    public string FusoHorario { get; set; } = string.Empty;
    public double ChuvaTotalMm { get; set; }
    public double ScoreMedio { get; set; }
    public double ScoreMax { get; set; }
    public int LeiturasAlto { get; set; }

    /// <summary>Dia completo tem ~96 leituras. Menos que isso indica buraco na coleta.</summary>
    public int LeiturasCount { get; set; }
}
