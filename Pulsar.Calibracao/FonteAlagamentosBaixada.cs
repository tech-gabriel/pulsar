using System.Globalization;

namespace Pulsar.Calibracao;

/// <summary>
/// Dias com alagamento ou enxurrada de rua documentados na Baixada (Defesa Civil e imprensa,
/// um link por linha). É o que faz o papel do GeoSampa na calibração da Baixada.
/// Formato: <c>data;municipio;fonte;descricao</c>, data ISO, município como em <see cref="Baixada.Todas"/>.
/// </summary>
public static class FonteAlagamentosBaixada
{
    public static string Arquivo(string raiz) => Path.Combine(raiz, "dados", "alagamentos-baixada.csv");

    public static Dictionary<string, HashSet<DateOnly>> Ler(string csv)
    {
        var dias = Baixada.Todas.ToDictionary(b => b.Nome, _ => new HashSet<DateOnly>());
        var linhas = csv.Replace("\r", "").Split('\n');
        // A primeira linha é pulada como cabeçalho: sem ele, o primeiro dia documentado sumiria.
        if (linhas[0].Trim().TrimStart('﻿') != "data;municipio;fonte;descricao")
            throw new FormatException($"alagamentos-baixada.csv: cabeçalho esperado 'data;municipio;fonte;descricao', veio '{linhas[0]}'");
        for (var i = 1; i < linhas.Length; i++)
        {
            if (string.IsNullOrWhiteSpace(linhas[i])) continue;
            var c = linhas[i].Split(';');
            if (c.Length < 3
                || !DateOnly.TryParseExact(c[0].Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia)
                || !dias.TryGetValue(c[1].Trim(), out var doMunicipio)
                || !c[2].Trim().StartsWith("http", StringComparison.OrdinalIgnoreCase))
                throw new FormatException($"alagamentos-baixada.csv, linha {i + 1}: '{linhas[i]}' (esperado data;municipio;fonte;descricao)");
            doMunicipio.Add(dia);
        }
        return dias;
    }
}
