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
    public DateTime Timestamp { get; set; }
    public DateTime CriadoEm { get; set; }

    public bool IsValida()
        => ChuvaMmH >= 0 && VentoKmH >= 0 && VisibilidadeKm > 0 && IndiceUv >= 0;
}
