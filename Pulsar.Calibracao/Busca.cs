using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.Calibracao;

public record Candidato(double EscalaIntensidade, double BonusSaturacao, ParametrosScore Parametros, Metricas Metricas);

public static class Busca
{
    public const double MaxPctDiasAlto = 0.05;

    /// <summary>Rank das ocorrências normalizado para 0,85..1,15 (empates ficam com o mesmo rank).</summary>
    public static IReadOnlyDictionary<string, double> Fatores(IReadOnlyDictionary<string, int> ocorrenciasPorSub)
    {
        var distintos = ocorrenciasPorSub.Values.Distinct().OrderBy(v => v).ToList();
        var n = distintos.Count;
        return ocorrenciasPorSub.ToDictionary(
            kv => kv.Key,
            kv => n <= 1 ? 1.0 : 0.85 + 0.30 * distintos.IndexOf(kv.Value) / (n - 1));
    }

    public static ParametrosScore Escalar(ParametrosScore b, double k, double bonus, IReadOnlyDictionary<string, double> fatores) => b with
    {
        Chuva1h = b.Chuva1h.Select(p => p with { X = p.X * k }).ToArray(),
        Chuva3h = b.Chuva3h.Select(p => p with { X = p.X * k }).ToArray(),
        Saturacao48h = [b.Saturacao48h[0], b.Saturacao48h[^1] with { Y = bonus }],
        Fatores = fatores,
    };

    public static Dictionary<string, HashSet<DateOnly>> DiasAlto(
        IReadOnlyDictionary<string, List<HoraClima>> series, ParametrosScore p)
        => series.ToDictionary(kv => kv.Key, kv =>
            Backtest.Entradas(kv.Key, kv.Value)
                .Zip(kv.Value)
                .Where(x => CalculadoraScore.Calcular(x.First, p).Alagamento.Faixa == FaixaRisco.ALTO)
                .Select(x => DateOnly.FromDateTime(x.Second.HoraLocal))
                .ToHashSet());

    public static List<Candidato> Grade(
        IReadOnlyDictionary<string, List<HoraClima>> series,
        IReadOnlyDictionary<string, HashSet<DateOnly>> ocorrencias,
        IReadOnlyDictionary<string, double> fatores, DateOnly de, DateOnly ate)
    {
        var res = new List<Candidato>();
        for (var k = 0.3; k <= 1.61; k += 0.1)
            foreach (var bonus in new[] { 0.0, 10, 20, 30 })
            {
                var p = Escalar(CalibracaoScore.Atual, Math.Round(k, 2), bonus, fatores);
                res.Add(new Candidato(Math.Round(k, 2), bonus, p, Backtest.Avaliar(DiasAlto(series, p), ocorrencias, de, ate)));
            }
        return res.OrderByDescending(c => c.Metricas.F1).ToList();
    }
}
