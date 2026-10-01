namespace Pulsar.Calibracao;

/// <summary>Fórmula anterior ao S1, só para comparação no relatório.</summary>
public static class FormulaAntiga
{
    public static double Calcular(HoraClima h)
    {
        static double N(double v, double min, double max) => Math.Clamp((v - min) / (max - min) * 100, 0, 100);
        var neblina = h.VisibilidadeKm >= 10 ? 0 : h.VisibilidadeKm <= 0.2 ? 100
            : Math.Clamp((10 - h.VisibilidadeKm) / (10 - 0.2) * 100, 0, 100);
        return Math.Clamp(N(h.ChuvaMm, 0, 50) * 0.35 + N(h.VentoKmH, 0, 80) * 0.30 + neblina * 0.20 + N(h.Uv, 0, 11) * 0.15, 0, 100);
    }
}
