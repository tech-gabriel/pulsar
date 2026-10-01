using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.Calibracao;

// Main explícito (sem top-level statements): o Program global gerado colidiria com o
// Program da API no projeto de testes, que referencia os dois.
internal static class Principal
{
    public static async Task Main(string[] args)
    {
        // Uso: dotnet run --project Pulsar.Calibracao [-- 2026-01-01 2026-08-31]
        var de = args.Length > 0 ? DateOnly.Parse(args[0]) : new DateOnly(2026, 1, 1);
        var ate = args.Length > 1 ? DateOnly.Parse(args[1]) : new DateOnly(2026, 8, 31);
        var raiz = AppContext.BaseDirectory.Split("bin")[0];
        var cache = Path.Combine(raiz, "cache");
        var saida = Path.Combine(raiz, "saida");

        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(120) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("Pulsar-Calibracao/1.0 (app-pulsar.com.br)");

        Console.WriteLine("Baixando ocorrências do GeoSampa...");
        var ocorrencias = await FonteGeoSampa.DiasAsync(http, cache);

        Console.WriteLine("Baixando séries do Open-Meteo...");
        var series = new Dictionary<string, List<HoraClima>>();
        foreach (var s in Subprefeituras.Todas)
            series[s.Nome] = await FonteOpenMeteo.SerieAsync(http, s, de, ate, cache);

        // Linha de base: fórmula antiga, ALTO = > 60.
        var diasAntiga = series.ToDictionary(kv => kv.Key, kv => kv.Value
            .Where(h => ClassificacaoRisco.Faixa(FormulaAntiga.Calcular(h)) == FaixaRisco.ALTO)
            .Select(h => DateOnly.FromDateTime(h.HoraLocal)).ToHashSet());
        var antiga = Backtest.Avaliar(diasAntiga, ocorrencias, de, ate);

        var semAjuste = Backtest.Avaliar(Busca.DiasAlto(series, CalibracaoScore.Atual), ocorrencias, de, ate);

        var fatores = Busca.Fatores(ocorrencias.ToDictionary(kv => kv.Key, kv => kv.Value.Count(d => d >= de && d <= ate)));
        var grade = Busca.Grade(series, ocorrencias, fatores, de, ate);
        var vencedor = grade.FirstOrDefault(c => c.Metricas.PctDiasAlto <= Busca.MaxPctDiasAlto) ?? grade[0];

        Directory.CreateDirectory(saida);
        var md = Relatorio.Gerar(antiga, semAjuste, vencedor, grade, de, ate);
        var arq = Path.Combine(saida, $"calibracao-{DateTime.Now:yyyyMMdd-HHmm}.md");
        await File.WriteAllTextAsync(arq, md);
        Console.WriteLine(md);
        Console.WriteLine($"Relatório: {arq}");
    }
}
