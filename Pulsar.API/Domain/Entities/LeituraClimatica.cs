namespace Pulsar.API.Domain.Entities;

public class LeituraClimatica
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;
    public double ChuvaMmH { get; set; }
    public double VentoKmH { get; set; }
    public double VisibilidadeKm { get; set; }
    public double IndiceUv { get; set; }
    public double TemperaturaC { get; set; }     // Temperatura em Celsius
    public double SensacaoTermica { get; set; }   // Sensação térmica em Celsius
    public double Umidade { get; set; }           // Umidade relativa em %
    public DateTime Timestamp { get; set; }
    public DateTime CriadoEm { get; set; }

    public bool IsValida()
        => ChuvaMmH >= 0 && VentoKmH >= 0 && VisibilidadeKm > 0 && IndiceUv >= 0;
}
