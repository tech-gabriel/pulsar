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

        // O fator acima saiu das mesmas ocorrências contra as quais ele é medido, o que
        // favorece o resultado. A validação cruzada tira a dúvida: para cada mês, o fator é
        // refeito SEM as ocorrências daquele mês e medido só nele.
        Metricas foraBase = new(0, 0, 0, 0, 0), foraCelula = new(0, 0, 0, 0, 0);
        for (var ini = de; ini <= ate; ini = ini.AddMonths(1))
        {
            var fim = ini.AddMonths(1).AddDays(-1) < ate ? ini.AddMonths(1).AddDays(-1) : ate;
            var treino = pontos.Where(p => p.Dia < ini || p.Dia > fim).ToList();
            var fatoresDoTreino = GradeH3.Fatores(
                GradeH3.Suavizado(treino, areaDaCelula.Keys.ToHashSet(), de, ate), areaDaCelula, CalibracaoScore.Atual);
            foraBase += Backtest.Avaliar(
                DiasAltoPorCelula(series, areaDaCelula, c => CalibracaoScore.Atual.Fator(areaDaCelula[c])), ocorrenciasDaCelula, ini, fim);
            foraCelula += Backtest.Avaliar(
                DiasAltoPorCelula(series, areaDaCelula, c => fatoresDoTreino[c]), ocorrenciasDaCelula, ini, fim);
        }

        var dentro = GradeH3.DentroDaTrava(comFatorDaArea, comFatorDaCelula);
        var md = Relatorio(areaDaCelula, suavizado, fatores, porArea, comFatorDaArea, comFatorDaCelula, foraBase, foraCelula, dentro, de, ate);
        var saida = Path.Combine(raiz, "saida");
        Directory.CreateDirectory(saida);
        var arqRelatorio = Path.Combine(saida, $"grade-{DateTime.Now:yyyyMMdd-HHmm}.md");
        await File.WriteAllTextAsync(arqRelatorio, md);
        Console.WriteLine(md);
        Console.WriteLine($"Relatório: {arqRelatorio}");

        // A grade só é gravada depois de passar na trava: uma grade reprovada nunca chega
        // a aparecer no diff para alguém commitar sem ler o relatório.
        if (!dentro)
            throw new InvalidOperationException("Grade reprovada na trava de excesso de alerta. O arquivo da grade NÃO foi alterado.");
        var arquivo = Path.Combine(repo, "Pulsar.API", "Domain", "Score", "grade-sao-paulo.json");
        await File.WriteAllTextAsync(arquivo, Json(areaDaCelula, fatores, de, ate));
        Console.WriteLine($"Grade: {arquivo}");
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
        Metricas foraBase, Metricas foraCelula, bool dentroDaTrava, DateOnly de, DateOnly ate)
    {
        var pt = CultureInfo.GetCultureInfo("pt-BR");
        string Linha(string nome, Metricas m) => string.Create(pt,
            $"| {nome} | {m.Precisao:P1} | {m.Cobertura:P1} | {m.F1:F3} | {m.PctDiasAlto:P2} | {m.DiasPrevistos} | {m.DiasOcorrencia} |");

        var sb = new StringBuilder();
        sb.AppendLine(pt, $"# Grade H3 de São Paulo ({de:dd/MM/yyyy} a {ate:dd/MM/yyyy})");
        sb.AppendLine();
        sb.AppendLine(pt, $"- Resolução {GradeH3.Resolucao}, {areaDaCelula.Count} células em {areaDaCelula.Values.Distinct().Count()} áreas. Entra toda célula que toca a cidade, então nenhum ponto dela fica sem trecho.");
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
        var trava = dentroDaTrava ? "dentro da trava" : "ACIMA DA TRAVA, grade não gravada";
        sb.AppendLine(pt, $"Trava contra excesso de alerta: o fator da célula pode somar no máximo {GradeH3.FolgaDiasAlto * 100:F1} ponto percentual de dias em ALTO sobre a mesma conta com o fator da área. Somou {(comFatorDaCelula.PctDiasAlto - comFatorDaArea.PctDiasAlto) * 100:F2} ({trava}).");
        sb.AppendLine();
        sb.AppendLine("## Validação fora da amostra");
        sb.AppendLine();
        sb.AppendLine("Para cada mês, o fator da célula é refeito sem as ocorrências daquele mês e medido só nele. É o número que vale para dizer se o trecho acerta mais: o backtest acima mede o fator contra as mesmas ocorrências que o geraram.");
        sb.AppendLine();
        sb.AppendLine("| Nível | Precisão | Cobertura | F1 | Dias em ALTO | Dias previstos | Dias com ocorrência |");
        sb.AppendLine("|---|---|---|---|---|---|---|");
        sb.AppendLine(Linha("Por célula, fator da área", foraBase));
        sb.AppendLine(Linha("Por célula, fator da célula (sem ver o mês)", foraCelula));
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
