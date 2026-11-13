using System.Globalization;
using System.Text;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.Calibracao;

/// <summary>
/// Modo <c>grade</c>: gera <c>Pulsar.API/Domain/Score/grade-sao-paulo.json</c> (células H3 da
/// capital com o fator de cada uma) e um relatório com o backtest por área e por célula.
/// Recalibrar a grade = rodar de novo e commitar o arquivo.
/// </summary>
public static class GeracaoGrade
{
    public static async Task ExecutarAsync(HttpClient http, string raiz, DateOnly de, DateOnly ate)
    {
        var repo = Path.GetFullPath(Path.Combine(raiz, ".."));
        var cache = Path.Combine(raiz, "cache");
        var geojson = await File.ReadAllTextAsync(Path.Combine(repo, "pulsar-web", "public", "subprefeituras-leve.geojson"));

        var areaDaCelula = GradeH3.Celulas(geojson);
        var pontos = await FonteGeoSampa.PontosAsync(http, cache);
        var suavizado = GradeH3.Suavizado(pontos, areaDaCelula.Keys.ToHashSet(), de, ate);
        var fatores = GradeH3.Fatores(suavizado, areaDaCelula, CalibracaoScore.Atual);

        var semCelula = Subprefeituras.Todas.Select(s => s.Nome).Except(areaDaCelula.Values).ToList();
        if (semCelula.Count > 0)
            throw new InvalidOperationException($"Áreas sem nenhuma célula: {string.Join(", ", semCelula)}");

        var arquivo = Path.Combine(repo, "Pulsar.API", "Domain", "Score", "grade-sao-paulo.json");
        await File.WriteAllTextAsync(arquivo, Json(areaDaCelula, fatores, de, ate));

        Console.WriteLine("Baixando séries do Open-Meteo...");
        var series = new Dictionary<string, List<HoraClima>>();
        foreach (var s in Subprefeituras.Todas)
            series[s.Nome] = await FonteOpenMeteo.SerieAsync(http, s, de, ate, cache);

        var porArea = Backtest.Avaliar(
            Busca.DiasAlto(series, CalibracaoScore.Atual), await FonteGeoSampa.DiasAsync(http, cache), de, ate);

        var ocorrenciasDaCelula = pontos
            .Where(p => p.Dia >= de && p.Dia <= ate)
            .GroupBy(p => GradeH3.CelulaDe(p.Lat, p.Lon))
            .Where(g => areaDaCelula.ContainsKey(g.Key))
            .ToDictionary(g => g.Key, g => g.Select(p => p.Dia).ToHashSet());
        // Toda célula entra na conta, mesmo sem ocorrência: é ela que mostra o alerta dado à toa.
        foreach (var c in areaDaCelula.Keys) ocorrenciasDaCelula.TryAdd(c, []);

        var comFatorDaArea = Backtest.Avaliar(
            DiasAltoPorCelula(series, areaDaCelula, c => CalibracaoScore.Atual.Fator(areaDaCelula[c])), ocorrenciasDaCelula, de, ate);
        var comFatorDaCelula = Backtest.Avaliar(
            DiasAltoPorCelula(series, areaDaCelula, c => fatores[c]), ocorrenciasDaCelula, de, ate);

        var md = Relatorio(areaDaCelula, suavizado, fatores, porArea, comFatorDaArea, comFatorDaCelula, de, ate);
        var saida = Path.Combine(raiz, "saida");
        Directory.CreateDirectory(saida);
        var arqRelatorio = Path.Combine(saida, $"grade-{DateTime.Now:yyyyMMdd-HHmm}.md");
        await File.WriteAllTextAsync(arqRelatorio, md);
        Console.WriteLine(md);
        Console.WriteLine($"Grade: {arquivo}");
        Console.WriteLine($"Relatório: {arqRelatorio}");
    }

    /// <summary>Dias em ALTO de cada célula: a série de clima é a da área dela; só o fator muda.</summary>
    private static Dictionary<string, HashSet<DateOnly>> DiasAltoPorCelula(
        IReadOnlyDictionary<string, List<HoraClima>> series,
        IReadOnlyDictionary<string, string> areaDaCelula, Func<string, double> fator)
    {
        // Muitas células dividem a mesma área e o mesmo fator: calcula uma vez por par.
        var memo = new Dictionary<(string, double), HashSet<DateOnly>>();
        return areaDaCelula.ToDictionary(kv => kv.Key, kv =>
        {
            var chave = (kv.Value, fator(kv.Key));
            if (!memo.TryGetValue(chave, out var dias))
            {
                var serie = series[kv.Value];
                dias = Backtest.Entradas(kv.Value, serie).Zip(serie)
                    .Where(x => CalculadoraScore.Calcular(x.First, CalibracaoScore.Atual, chave.Item2).Alagamento.Faixa == FaixaRisco.ALTO)
                    .Select(x => DateOnly.FromDateTime(x.Second.HoraLocal))
                    .ToHashSet();
                memo[chave] = dias;
            }
            return dias;
        });
    }

    private static string Json(
        IReadOnlyDictionary<string, string> areaDaCelula, IReadOnlyDictionary<string, double> fatores, DateOnly de, DateOnly ate)
    {
        var inv = CultureInfo.InvariantCulture;
        var sb = new StringBuilder();
        sb.Append("{\n");
        sb.Append(inv, $"  \"resolucao\": {GradeH3.Resolucao},\n");
        sb.Append(inv, $"  \"geradoEm\": \"{DateTime.Now:yyyy-MM-dd}\",\n");
        sb.Append(inv, $"  \"periodo\": {{ \"de\": \"{de:yyyy-MM-dd}\", \"ate\": \"{ate:yyyy-MM-dd}\" }},\n");
        sb.Append("  \"celulas\": [\n");
        // Uma célula por linha, em ordem fixa, para o diff de uma recalibração ser legível.
        var linhas = areaDaCelula.Keys.OrderBy(c => c, StringComparer.Ordinal).Select(c =>
        {
            var (lat, lon) = GradeH3.Centro(c);
            return string.Create(inv,
                $"    {{ \"h3\": \"{c}\", \"lat\": {lat:F5}, \"lon\": {lon:F5}, \"sub\": \"{areaDaCelula[c]}\", \"fator\": {fatores[c]} }}");
        });
        sb.Append(string.Join(",\n", linhas));
        sb.Append("\n  ]\n}\n");
        return sb.ToString();
    }

    private static string Relatorio(
        IReadOnlyDictionary<string, string> areaDaCelula, IReadOnlyDictionary<string, double> suavizado,
        IReadOnlyDictionary<string, double> fatores, Metricas porArea, Metricas comFatorDaArea, Metricas comFatorDaCelula,
        DateOnly de, DateOnly ate)
    {
        var pt = CultureInfo.GetCultureInfo("pt-BR");
        string Linha(string nome, Metricas m) => string.Create(pt,
            $"| {nome} | {m.Precisao:P1} | {m.Cobertura:P1} | {m.F1:F3} | {m.PctDiasAlto:P2} | {m.DiasPrevistos} | {m.DiasOcorrencia} |");

        var sb = new StringBuilder();
        sb.AppendLine(pt, $"# Grade H3 de São Paulo ({de:dd/MM/yyyy} a {ate:dd/MM/yyyy})");
        sb.AppendLine();
        sb.AppendLine(pt, $"- Resolução {GradeH3.Resolucao}, {areaDaCelula.Count} células em {areaDaCelula.Values.Distinct().Count()} áreas.");
        sb.AppendLine(pt, $"- Células com histórico de alagamento (próprio ou de vizinha): {suavizado.Values.Count(v => v > 0)}.");
        sb.AppendLine(pt, $"- Fator por célula: de {fatores.Values.Min():F4} a {fatores.Values.Max():F4}.");
        sb.AppendLine();
        sb.AppendLine("## Backtest");
        sb.AppendLine();
        sb.AppendLine("Dia previsto = algum momento do dia em ALTO. Mesma regra de acerto do backtest por área.");
        sb.AppendLine();
        sb.AppendLine("| Nível | Precisão | Cobertura | F1 | Dias em ALTO | Dias previstos | Dias com ocorrência |");
        sb.AppendLine("|---|---|---|---|---|---|---|");
        sb.AppendLine(Linha("Por área (cálculo atual)", porArea));
        sb.AppendLine(Linha("Por célula, fator da área", comFatorDaArea));
        sb.AppendLine(Linha("Por célula, fator da célula", comFatorDaCelula));
        sb.AppendLine();
        var trava = comFatorDaCelula.PctDiasAlto <= Busca.MaxPctDiasAlto ? "dentro da trava" : "ACIMA DA TRAVA";
        sb.AppendLine(pt, $"Trava contra excesso de alerta: no máximo {Busca.MaxPctDiasAlto:P0} dos dias em ALTO. Por célula com o fator novo: {comFatorDaCelula.PctDiasAlto:P2} ({trava}).");
        sb.AppendLine();
        sb.AppendLine("## Células por área");
        sb.AppendLine();
        sb.AppendLine("| Área | Células | Com histórico | Maior fator |");
        sb.AppendLine("|---|---|---|---|");
        foreach (var g in areaDaCelula.GroupBy(kv => kv.Value).OrderBy(g => g.Key, StringComparer.Create(pt, false)))
            sb.AppendLine(pt, $"| {g.Key} | {g.Count()} | {g.Count(kv => suavizado[kv.Key] > 0)} | {g.Max(kv => fatores[kv.Key]):F4} |");
        return sb.ToString();
    }
}
