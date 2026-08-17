namespace Pulsar.API.DTOs;

/// <summary>Um ponto de previsão já normalizado, saindo do cliente HTTP.</summary>
public class PontoPrevisaoDto
{
    public DateTime InstantePrevisto { get; set; }
    public double ChuvaMm { get; set; }
    public double ProbabilidadeChuva { get; set; }
    public double VentoKmH { get; set; }
    public double? RajadaKmH { get; set; }
    public double TemperaturaC { get; set; }
    public int CondicaoCodigo { get; set; }
    public string CondicaoDescricao { get; set; } = string.Empty;
}
