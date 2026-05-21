using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Entities;

public class ScorePerigo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;
    public Guid LeituraId { get; set; }
    public LeituraClimatica Leitura { get; set; } = null!;
    public double Valor { get; set; }
    public FaixaRisco Faixa { get; set; }
    public DateTime Timestamp { get; set; }
    public DateTime CriadoEm { get; set; }

    public double Calcular(LeituraClimatica leitura)
    {
        var normChuva = Normalizar(leitura.ChuvaMmH, 0, 50);
        var normVento = Normalizar(leitura.VentoKmH, 0, 80);
        var normNeblina = NormalizarNeblina(leitura.VisibilidadeKm);
        var normUv = Normalizar(leitura.IndiceUv, 0, 11);

        return Math.Clamp(
            (normChuva * 0.35) + (normVento * 0.30) + (normNeblina * 0.20) + (normUv * 0.15),
            0, 100);
    }

    public FaixaRisco ClassificarFaixa() => Valor switch
    {
        <= 30 => FaixaRisco.BAIXO,
        <= 60 => FaixaRisco.MODERADO,
        _ => FaixaRisco.ALTO
    };

    private static double Normalizar(double valor, double min, double max)
        => Math.Clamp((valor - min) / (max - min) * 100, 0, 100);

    private static double NormalizarNeblina(double visibilidadeKm)
    {
        if (visibilidadeKm >= 10) return 0;
        if (visibilidadeKm <= 0.2) return 100;
        return Math.Clamp((10 - visibilidadeKm) / (10 - 0.2) * 100, 0, 100);
    }
}
