using System.Globalization;
using System.Text;
using Pulsar.API.Domain.Score;

namespace Pulsar.Calibracao;

public static class Relatorio
{
    private static string F(double v) => v.ToString("0.###", CultureInfo.InvariantCulture);
    private static string P(double v) => v.ToString("P0", CultureInfo.InvariantCulture);
    private static string P1(double v) => v.ToString("P1", CultureInfo.InvariantCulture);

    private static string Pontos(PontoCurva[] ps) => "[" + string.Join(", ", ps.Select(p => $"new({F(p.X)}, {F(p.Y)})")) + "]";

    public static string Gerar(Metricas antiga, Metricas atualSemAjuste, Candidato vencedor, IReadOnlyList<Candidato> top, DateOnly de, DateOnly ate)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"# Calibração S1 ({de:yyyy-MM-dd} a {ate:yyyy-MM-dd})");
        sb.AppendLine();
        sb.AppendLine("Fonte do clima: Open-Meteo Historical Forecast API (CC BY 4.0). Ocorrências: Defesa Civil via GeoSampa.");
        sb.AppendLine();
        sb.AppendLine("| Fórmula | Precisão | Cobertura | F1 | % dias ALTO |");
        sb.AppendLine("|---|---|---|---|---|");
        void Linha(string n, Metricas m) => sb.AppendLine($"| {n} | {P(m.Precisao)} | {P(m.Cobertura)} | {F(m.F1)} | {P1(m.PctDiasAlto)} |");
        Linha("Antiga (chuva+vento+neblina+UV)", antiga);
        Linha("Nova, pontos de partida", atualSemAjuste);
        Linha($"Nova, calibrada (k={F(vencedor.EscalaIntensidade)}, bônus={F(vencedor.BonusSaturacao)})", vencedor.Metricas);
        sb.AppendLine();
        sb.AppendLine("## Top 10 da grade");
        sb.AppendLine("| k | bônus | Precisão | Cobertura | F1 | % dias ALTO |");
        sb.AppendLine("|---|---|---|---|---|---|");
        foreach (var c in top.Take(10))
            sb.AppendLine($"| {F(c.EscalaIntensidade)} | {F(c.BonusSaturacao)} | {P(c.Metricas.Precisao)} | {P(c.Metricas.Cobertura)} | {F(c.Metricas.F1)} | {P1(c.Metricas.PctDiasAlto)} |");
        sb.AppendLine();
        sb.AppendLine("## Bloco para CalibracaoScore.cs");
        sb.AppendLine("```csharp");
        var p = vencedor.Parametros;
        sb.AppendLine($"        Chuva1h: {Pontos(p.Chuva1h)},");
        sb.AppendLine($"        Chuva3h: {Pontos(p.Chuva3h)},");
        sb.AppendLine($"        Saturacao48h: {Pontos(p.Saturacao48h)},");
        sb.AppendLine("        Fatores: new Dictionary<string, double>");
        sb.AppendLine("        {");
        foreach (var kv in p.Fatores.OrderBy(kv => kv.Key, StringComparer.Ordinal))
            sb.AppendLine($"            [\"{kv.Key}\"] = {F(Math.Round(kv.Value, 3))},");
        sb.AppendLine("        });");
        sb.AppendLine("```");
        return sb.ToString();
    }
}
