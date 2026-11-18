using System.Globalization;
using System.Text;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.Calibracao;

/// <summary>Relatório do modo <c>grade-baixada</c>: o que o user confere antes de ligar a calibração.</summary>
public static class RelatorioBaixada
{
    private static string F(double v) => Relatorio.F(v);
    private static string P1(double v) => v.ToString("P1", CultureInfo.InvariantCulture);
    private static string Mm(double v) => v.ToString("0.0", CultureInfo.InvariantCulture);

    public static string Gerar(
        EscolhaBaixada escolha, IReadOnlyDictionary<string, HashSet<DateOnly>> docs,
        IReadOnlyDictionary<string, List<HoraClima>> series, IReadOnlyDictionary<string, List<HoraClima>> capital,
        IReadOnlyList<PoligonoSgb> poligonos, IReadOnlyDictionary<string, double> peso,
        IReadOnlyDictionary<string, double> fatores, IReadOnlyDictionary<string, string> areaDaCelula,
        Metricas comFatorDaArea, Metricas comFatorDaCelula, bool dentro, DateOnly de, DateOnly ate)
    {
        var p = escolha.Vencedor.Parametros;
        var m = escolha.Vencedor.Metricas;
        var sb = new StringBuilder();
        sb.AppendLine($"# Calibração da Baixada Santista ({de:yyyy-MM-dd} a {ate:yyyy-MM-dd})");
        sb.AppendLine();
        sb.AppendLine("Clima: Open-Meteo Historical Forecast API (CC BY 4.0), na sede de cada município. Alagamentos: lista curada "
            + $"(`Pulsar.Calibracao/dados/alagamentos-baixada.csv`, {docs.Values.Sum(d => d.Count)} dias por município, com fonte). "
            + $"\"Costuma alagar\": SGB, GeoPortal (consultado em {DateTime.Now:yyyy-MM-dd}).");
        sb.AppendLine();
        sb.AppendLine("## Limiares escolhidos");
        sb.AppendLine($"k = {F(escolha.Vencedor.EscalaIntensidade)} (1 = limiares da capital; maior = precisa de mais chuva para alertar), "
            + $"bônus de saturação = {F(escolha.Vencedor.BonusSaturacao)}.");
        sb.AppendLine($"Contra os dias documentados: precisão {P1(m.Precisao)}, cobertura {P1(m.Cobertura)} ({m.DiasOcorrenciaCobertos} de {m.DiasOcorrencia}), F1 {F(m.F1)}.");
        sb.AppendLine();
        sb.AppendLine("| Município | Fator da área | Dias em Alerta (alagamento) | Dias/temporada | Alagamentos documentados | Pegos | Trechos | Trechos com \"costuma alagar\" |");
        sb.AppendLine("|---|---|---|---|---|---|---|---|");
        var alto = Busca.DiasAlto(series, p);
        var temporadas = (ate.DayNumber - de.DayNumber + 1) / 365.0;
        foreach (var b in Baixada.Todas.Select(b => b.Nome))
        {
            var a = alto[b].Count(d => d >= de && d <= ate);
            var d = docs[b];
            var pegos = d.Count(x => alto[b].Contains(x) || alto[b].Contains(x.AddDays(-1)));
            var celulas = areaDaCelula.Where(kv => kv.Value == b).Select(kv => kv.Key).ToList();
            var comSgb = celulas.Count(c => peso[c] > 0);
            sb.AppendLine($"| {b} | {F(escolha.Fatores[b])} | {a} ({P1(escolha.PctDiasAltoPorArea[b])}) | {F(Math.Round(a / temporadas, 1))} | {d.Count} | {pegos} | {celulas.Count} | {comSgb} |");
        }
        sb.AppendLine();
        sb.AppendLine("## Trava do fator por trecho");
        sb.AppendLine($"Dias em Alerta com o fator da área: {P1(comFatorDaArea.PctDiasAlto)}; com o fator de cada trecho: {P1(comFatorDaCelula.PctDiasAlto)}. "
            + $"Folga permitida: {P1(GradeH3.FolgaDiasAlto)}. **{(dentro ? "Aprovada" : "REPROVADA")}**.");
        sb.AppendLine();
        sb.AppendLine("## SGB por município (polígonos)");
        sb.AppendLine("| Município | Alta | Média | Enxurrada | Setor de risco |");
        sb.AppendLine("|---|---|---|---|---|");
        foreach (var b in Baixada.Todas.Select(b => b.Nome))
        {
            int N(string c) => poligonos.Count(x => x.Municipio == b && x.Classe == c);
            sb.AppendLine($"| {b} | {N("Alta")} | {N("Média")} | {N("Enxurrada")} | {N("Setor")} |");
        }
        sb.AppendLine();
        sb.AppendLine("## Vento e calor com as curvas da capital (dias em Alerta)");
        sb.AppendLine("| Lugar | Vento | Calor |");
        sb.AppendLine("|---|---|---|");
        foreach (var (nome, serie) in series.Concat(capital))
        {
            var dias = (ate.DayNumber - de.DayNumber + 1);
            var e = Backtest.Entradas(nome, serie).Zip(serie).Select(x => (Dia: DateOnly.FromDateTime(x.Second.HoraLocal), R: CalculadoraScore.Calcular(x.First, CalibracaoScore.Atual, 1.0))).ToList();
            var vento = e.Where(x => x.R.Vento.Faixa == FaixaRisco.ALTO).Select(x => x.Dia).Distinct().Count();
            var calor = e.Where(x => x.R.Calor.Faixa == FaixaRisco.ALTO).Select(x => x.Dia).Distinct().Count();
            sb.AppendLine($"| {nome}{(capital.ContainsKey(nome) ? " (capital)" : "")} | {vento} ({P1((double)vento / dias)}) | {calor} ({P1((double)calor / dias)}) |");
        }
        sb.AppendLine();
        sb.AppendLine("## Exemplos: os 10 dias de mais chuva (município que mais choveu no dia)");
        sb.AppendLine("| Dia | Município | Chuva no dia (mm) | Maior em 3 h (mm) | O que o Pulsar diria | Alagamento documentado nesse dia |");
        sb.AppendLine("|---|---|---|---|---|---|");
        var porDia = series.SelectMany(kv => Backtest.Entradas(kv.Key, kv.Value).Zip(kv.Value)
                .Select(x => (Area: kv.Key, Dia: DateOnly.FromDateTime(x.Second.HoraLocal), x.Second.ChuvaMm, E: x.First)))
            .GroupBy(x => (x.Area, x.Dia))
            .Select(g => (g.Key.Area, g.Key.Dia, Total: g.Sum(x => x.ChuvaMm), Max3h: g.Max(x => x.E.Chuva3hMm),
                Pior: g.Max(x => CalculadoraScore.Calcular(x.E, p, p.Fator(g.Key.Area)).Alagamento.Valor)))
            .GroupBy(x => x.Dia).Select(g => g.OrderByDescending(x => x.Total).First())
            .OrderByDescending(x => x.Total).Take(10);
        foreach (var x in porDia)
        {
            var onde = docs.Where(kv => kv.Value.Contains(x.Dia) || kv.Value.Contains(x.Dia.AddDays(1))).Select(kv => kv.Key).ToList();
            sb.AppendLine($"| {x.Dia:dd/MM/yyyy} | {x.Area} | {Mm(x.Total)} | {Mm(x.Max3h)} | {ClassificacaoRisco.Rotulo(ClassificacaoRisco.Faixa(x.Pior))} ({F(Math.Round(x.Pior))}) | {(onde.Count == 0 ? "não" : string.Join(", ", onde))} |");
        }
        sb.AppendLine();
        sb.AppendLine("## Bloco para CalibracaoScore.Baixada");
        sb.AppendLine("```csharp");
        sb.AppendLine($"        Chuva1h: {Relatorio.Pontos(p.Chuva1h)},");
        sb.AppendLine($"        Chuva3h: {Relatorio.Pontos(p.Chuva3h)},");
        sb.AppendLine($"        Saturacao48h: {Relatorio.Pontos(p.Saturacao48h)},");
        sb.AppendLine("        Fatores: new Dictionary<string, double>");
        sb.AppendLine("        {");
        foreach (var kv in escolha.Fatores.OrderBy(kv => kv.Key, StringComparer.Ordinal))
            sb.AppendLine($"            [\"{kv.Key}\"] = {F(kv.Value)},");
        sb.AppendLine("        });");
        sb.AppendLine("```");
        return sb.ToString();
    }
}
