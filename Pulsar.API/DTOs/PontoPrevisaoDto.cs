namespace Pulsar.API.DTOs;

/// <summary>Um ponto de previsão já normalizado, saindo do cliente HTTP.</summary>
public class PontoPrevisaoDto
{
    public DateTime InstantePrevisto { get; set; }
    public double ChuvaMm { get; set; }
    /// <summary>
    /// O <c>pop</c> do OpenWeatherMap: fração de 0 a 1, NÃO porcentagem (0.82 = 82%).
    /// Quem for calibrar limiar compara com 0.6, e não com 60.
    /// </summary>
    public double ProbabilidadeChuva { get; set; }
    public double VentoKmH { get; set; }
    public double? RajadaKmH { get; set; }
    public double TemperaturaC { get; set; }
    public int CondicaoCodigo { get; set; }
    public string CondicaoDescricao { get; set; } = string.Empty;
}
