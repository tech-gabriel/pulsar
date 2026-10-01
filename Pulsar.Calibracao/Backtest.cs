using Pulsar.API.Domain.Score;

namespace Pulsar.Calibracao;

public record Metricas(int DiasPrevistos, int DiasPrevistosCertos, int DiasOcorrencia, int DiasOcorrenciaCobertos, int DiasTotais)
{
    public double Precisao => DiasPrevistos == 0 ? 0 : (double)DiasPrevistosCertos / DiasPrevistos;
    public double Cobertura => DiasOcorrencia == 0 ? 0 : (double)DiasOcorrenciaCobertos / DiasOcorrencia;
    public double F1 => Precisao + Cobertura == 0 ? 0 : 2 * Precisao * Cobertura / (Precisao + Cobertura);
    public double PctDiasAlto => DiasTotais == 0 ? 0 : (double)DiasPrevistos / DiasTotais;
}

public static class Backtest
{
    /// <summary>Converte a série horária em entradas da calculadora (janelas 1h, 3h, 48h).</summary>
    public static IEnumerable<EntradaScore> Entradas(string sub, IReadOnlyList<HoraClima> serie)
    {
        for (var i = 0; i < serie.Count; i++)
        {
            var fim = i;
            double Soma(int horas)
            {
                var s = 0.0;
                for (var j = Math.Max(0, fim - horas + 1); j <= fim; j++) s += serie[j].ChuvaMm;
                return s;
            }
            yield return new EntradaScore(serie[i].ChuvaMm, Soma(3), Soma(48), serie[i].VentoKmH, serie[i].SensacaoC, sub);
        }
    }

    /// <summary>
    /// Previsto em D acerta se houver ocorrência em D ou D+1 (atraso de registro).
    /// Ocorrência em D está coberta se houve previsão em D ou D-1.
    /// </summary>
    public static Metricas Avaliar(
        IReadOnlyDictionary<string, HashSet<DateOnly>> previstos,
        IReadOnlyDictionary<string, HashSet<DateOnly>> ocorrencias,
        DateOnly de, DateOnly ate)
    {
        int prev = 0, prevOk = 0, oco = 0, ocoOk = 0;
        var subs = previstos.Keys.Union(ocorrencias.Keys).ToList();
        foreach (var s in subs)
        {
            var p = previstos.GetValueOrDefault(s) ?? [];
            var o = ocorrencias.GetValueOrDefault(s) ?? [];
            foreach (var d in p.Where(d => d >= de && d <= ate))
            {
                prev++;
                if (o.Contains(d) || o.Contains(d.AddDays(1))) prevOk++;
            }
            foreach (var d in o.Where(d => d >= de && d <= ate))
            {
                oco++;
                if (p.Contains(d) || p.Contains(d.AddDays(-1))) ocoOk++;
            }
        }
        var diasTotais = (ate.DayNumber - de.DayNumber + 1) * Math.Max(1, subs.Count);
        return new Metricas(prev, prevOk, oco, ocoOk, diasTotais);
    }
}
