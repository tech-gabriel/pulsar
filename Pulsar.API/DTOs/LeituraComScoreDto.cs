namespace Pulsar.API.DTOs;

public class LeituraComScoreDto
{
    public double ChuvaMmH { get; set; }
    public double VentoKmH { get; set; }
    public double VisibilidadeKm { get; set; }
    public double IndiceUv { get; set; }
    public double TemperaturaC { get; set; }
    public double SensacaoTermica { get; set; }
    public double Umidade { get; set; }
    public DateTime Timestamp { get; set; }
    public ScoreDto? Score { get; set; }
}
