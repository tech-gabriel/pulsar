namespace Pulsar.API.DTOs;

public class DadosClimaticosDto
{
    public double ChuvaMmH { get; set; }
    public double VentoKmH { get; set; }
    /// <summary>Graus de onde o vento VEM (0 = norte, convenção meteorológica). Null quando a fonte não informa.</summary>
    public double? VentoDirecaoGraus { get; set; }
    public double VisibilidadeKm { get; set; }
    public double IndiceUv { get; set; }
    public double TemperaturaC { get; set; }
    public double SensacaoTermica { get; set; }
    public double Umidade { get; set; }
    public DateTime Timestamp { get; set; }
}
