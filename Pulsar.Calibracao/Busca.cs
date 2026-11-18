using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.Calibracao;

public record EscolhaBaixada(Candidato Vencedor, IReadOnlyDictionary<string, double> Fatores, IReadOnlyDictionary<string, double> PctDiasAltoPorArea);

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

    /// <summary>Passo e piso do fator da área que passa da trava (critério para separar Cubatão).</summary>
    public const double PassoFatorArea = 0.025, PisoFatorArea = 0.85;

    /// <summary>
    /// Limiares da Baixada: a grade de busca da capital, mas cada candidato só vale se nenhuma
    /// área passar de <see cref="MaxPctDiasAlto"/> dias em ALTO. A área que passa perde fator de
    /// <see cref="PassoFatorArea"/> em <see cref="PassoFatorArea"/> até <see cref="PisoFatorArea"/>;
    /// se nem assim couber, o candidato cai. Vence o maior F1 contra os dias documentados;
    /// empate fica com o maior k (menos alerta). Nenhum candidato: lança com as áreas culpadas.
    /// </summary>
    public static EscolhaBaixada Baixada(
        IReadOnlyDictionary<string, List<HoraClima>> series,
        IReadOnlyDictionary<string, HashSet<DateOnly>> ocorrencias, DateOnly de, DateOnly ate)
    {
        var dias = ate.DayNumber - de.DayNumber + 1;
        EscolhaBaixada? melhor = null;
        var foraDaTrava = new HashSet<string>();
        for (var k = 0.3; k <= 1.61; k += 0.1)
            foreach (var bonus in new[] { 0.0, 10, 20, 30 })
            {
                var fatores = series.Keys.ToDictionary(a => a, _ => 1.0);
                Dictionary<string, HashSet<DateOnly>> alto;
                Dictionary<string, double> pct;
                ParametrosScore p;
                while (true)
                {
                    p = Escalar(CalibracaoScore.Atual, Math.Round(k, 2), bonus, fatores);
                    alto = DiasAlto(series, p);
                    pct = alto.ToDictionary(kv => kv.Key, kv => (double)kv.Value.Count(d => d >= de && d <= ate) / dias);
                    var acima = pct.Where(kv => kv.Value > MaxPctDiasAlto).Select(kv => kv.Key).ToList();
                    if (acima.Count == 0) break;
                    var semPiso = acima.Where(a => fatores[a] - PassoFatorArea >= PisoFatorArea - 1e-9).ToList();
                    if (semPiso.Count < acima.Count) { foraDaTrava.UnionWith(acima.Except(semPiso)); p = null!; break; }
                    foreach (var a in semPiso) fatores[a] = Math.Round(fatores[a] - PassoFatorArea, 4);
                }
                if (p is null) continue;
                var c = new Candidato(Math.Round(k, 2), bonus, p, Backtest.Avaliar(alto, ocorrencias, de, ate));
                if (melhor is null || c.Metricas.F1 > melhor.Vencedor.Metricas.F1 + 1e-12
                    || (Math.Abs(c.Metricas.F1 - melhor.Vencedor.Metricas.F1) <= 1e-12 && c.EscalaIntensidade > melhor.Vencedor.EscalaIntensidade))
                    melhor = new EscolhaBaixada(c, fatores, pct);
            }
        return melhor ?? throw new InvalidOperationException(
            $"Nenhum limiar deixa estas áreas dentro da trava de {MaxPctDiasAlto:P0} dos dias em ALTO, nem com fator {PisoFatorArea}: {string.Join(", ", foraDaTrava)}. Curvas próprias para elas precisam de decisão do user.");
    }
}
