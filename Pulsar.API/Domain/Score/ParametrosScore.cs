namespace Pulsar.API.Domain.Score;

public readonly record struct PontoCurva(double X, double Y);

public static class Curva
{
    /// <summary>Interpolação linear por partes; fora das pontas, satura no valor da ponta.</summary>
    public static double Interpolar(IReadOnlyList<PontoCurva> pontos, double x)
    {
        if (double.IsNaN(x) || x <= pontos[0].X) return pontos[0].Y;
        for (var i = 1; i < pontos.Count; i++)
        {
            if (x <= pontos[i].X)
            {
                var a = pontos[i - 1];
                var b = pontos[i];
                return a.Y + (b.Y - a.Y) * (x - a.X) / (b.X - a.X);
            }
        }
        return pontos[^1].Y;
    }
}

/// <summary>
/// Tudo que a calibração ajusta. Record imutável para a ferramenta de backtest variar
/// um campo com `with` sem tocar no resto.
/// </summary>
public sealed record ParametrosScore(
    PontoCurva[] Chuva1h,
    PontoCurva[] Chuva3h,
    PontoCurva[] Saturacao48h,
    PontoCurva[] Vento,
    PontoCurva[] Calor,
    IReadOnlyDictionary<string, double> Fatores)
{
    /// <summary>Fator de suscetibilidade; subprefeitura fora do dicionário é neutra (1,0).</summary>
    public double Fator(string nomeSubprefeitura)
        => Fatores.TryGetValue(nomeSubprefeitura, out var f) ? f : 1.0;
}
