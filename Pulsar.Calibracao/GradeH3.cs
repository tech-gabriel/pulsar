using System.Globalization;
using System.Text;
using System.Text.Json;
using H3;
using H3.Algorithms;
using H3.Extensions;
using NetTopologySuite.Geometries;
using Pulsar.API.Domain.Score;

namespace Pulsar.Calibracao;

/// <summary>
/// Grade de hexágonos (H3) de uma cidade e o fator de suscetibilidade de cada célula.
/// A API não conhece H3: recebe o arquivo pronto que sai daqui, do mesmo jeito que
/// <see cref="CalibracaoScore"/> é saída desta ferramenta.
/// </summary>
public static class GradeH3
{
    /// <summary>Resolução 8: hexágonos de cerca de 900 m de largura (decisão do desenho de 13/11/2026).</summary>
    public const int Resolucao = 8;

    /// <summary>O trecho com mais histórico de alagamento da cidade fica 25% acima do fator da área dele.</summary>
    public const double AcrescimoMaximo = 0.25;

    /// <summary>
    /// Trava contra excesso de alerta: o fator por célula pode aumentar os dias em ALTO em no
    /// máximo meio ponto percentual sobre a mesma conta feita com o fator da área.
    /// </summary>
    public const double FolgaDiasAlto = 0.005;

    public static bool DentroDaTrava(Metricas comFatorDaArea, Metricas comFatorDaCelula)
        => Math.Round(comFatorDaCelula.PctDiasAlto - comFatorDaArea.PctDiasAlto, 6) <= FolgaDiasAlto;

    public static string CelulaDe(double lat, double lon) => new Coordinate(lon, lat).ToH3Index(Resolucao).ToString();

    public static (double Lat, double Lon) Centro(string h3)
    {
        var c = new H3Index(h3).ToCoordinate();
        return (c.Y, c.X);
    }

    public static IEnumerable<string> Vizinhas(string h3)
        => new H3Index(h3).GridDiskDistances(1).Where(r => r.Distance == 1).Select(r => r.Index.ToString());

    /// <summary>
    /// Nome da área como o banco conhece ("M'Boi Mirim") a partir do nome do GeoSampa
    /// ("M BOI MIRIM"). Sem correspondência, lança: área sem nome casado ficaria sem
    /// células em silêncio.
    /// </summary>
    public static string NomeCanonico(string nomeDoGeojson)
    {
        var chave = Chave(nomeDoGeojson);
        return Subprefeituras.Todas.FirstOrDefault(s => Chave(s.Nome) == chave)?.Nome
            ?? throw new InvalidOperationException($"Área do geojson sem correspondência nas subprefeituras: '{nomeDoGeojson}'");
    }

    private static string Chave(string nome)
        => new(nome.Normalize(NormalizationForm.FormD)
            .Where(c => char.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark && char.IsLetterOrDigit(c))
            .Select(char.ToUpperInvariant).ToArray());

    /// <summary>
    /// Células da grade (índice H3 em texto) e a área de cada uma. Entra toda célula que
    /// toca alguma área, para que nenhum ponto da cidade fique sem trecho; na divisa, a
    /// célula fica com a área que ocupa a maior parte dela.
    /// </summary>
    public static IReadOnlyDictionary<string, string> Celulas(string geojson)
    {
        var areas = new List<(string Nome, Polygon Poligono, Geometry Valido)>();
        using var doc = JsonDocument.Parse(geojson);
        foreach (var f in doc.RootElement.GetProperty("features").EnumerateArray())
        {
            var nome = NomeCanonico(f.GetProperty("properties").GetProperty("nm_subprefeitura").GetString() ?? "");
            var geo = f.GetProperty("geometry");
            var coords = geo.GetProperty("coordinates");
            var poligonos = geo.GetProperty("type").GetString() == "MultiPolygon"
                ? coords.EnumerateArray().ToList()
                : [coords];
            // O contorno simplificado tem trechos que se cruzam; Buffer(0) conserta para a conta de área.
            areas.AddRange(poligonos.Select(Poligono).Select(p => (nome, p, p.IsValid ? p : p.Buffer(0))));
        }

        // Candidatas: as células com o centro dentro e as dos vértices da borda, mais dois
        // anéis em volta. É folga de sobra para alcançar toda célula que encosta na área.
        var candidatas = areas
            .SelectMany(a => a.Poligono.Fill(Resolucao)
                .Concat(a.Poligono.Coordinates.Select(c => c.ToH3Index(Resolucao))))
            .Distinct()
            .SelectMany(i => i.GridDiskDistances(2).Select(r => r.Index))
            .Distinct();

        var celulas = new Dictionary<string, string>();
        foreach (var indice in candidatas)
        {
            var hexagono = indice.GetCellBoundary();
            var melhor = areas
                .Where(a => a.Valido.EnvelopeInternal.Intersects(hexagono.EnvelopeInternal))
                .Select(a => (a.Nome, Parte: a.Valido.Intersection(hexagono).Area))
                .Where(x => x.Parte > 0)
                .GroupBy(x => x.Nome)
                .Select(g => (Nome: g.Key, Parte: g.Sum(x => x.Parte)))
                .OrderByDescending(x => x.Parte).ThenBy(x => x.Nome, StringComparer.Ordinal)
                .FirstOrDefault();
            if (melhor.Nome is not null) celulas[indice.ToString()] = melhor.Nome;
        }
        return celulas;
    }

    private static Polygon Poligono(JsonElement aneis)
    {
        var lista = aneis.EnumerateArray()
            .Select(a => GeometryFactory.Default.CreateLinearRing(
                a.EnumerateArray().Select(xy => new Coordinate(xy[0].GetDouble(), xy[1].GetDouble())).ToArray()))
            .ToList();
        return GeometryFactory.Default.CreatePolygon(lista[0], lista.Skip(1).ToArray());
    }

    /// <summary>
    /// Ocorrências da própria célula mais metade das ocorrências das 6 vizinhas. Com cerca
    /// de 450 ocorrências para 2 mil células, sem suavizar quase toda célula ficaria em zero
    /// e o endereço exato do registro pesaria demais.
    /// </summary>
    public static Dictionary<string, double> Suavizado(
        IEnumerable<OcorrenciaPonto> pontos, IReadOnlySet<string> celulas, DateOnly de, DateOnly ate)
    {
        var proprias = pontos
            .Where(p => p.Dia >= de && p.Dia <= ate)
            .Select(p => CelulaDe(p.Lat, p.Lon))
            .Where(celulas.Contains)
            .GroupBy(c => c)
            .ToDictionary(g => g.Key, g => g.Count());

        return celulas.ToDictionary(c => c, c =>
            proprias.GetValueOrDefault(c) + 0.5 * Vizinhas(c).Sum(v => proprias.GetValueOrDefault(v)));
    }

    /// <summary>
    /// Fator da célula = fator da área × m. Sem histórico, m = 1 (a célula fica com o fator
    /// da área, nunca abaixo). Com histórico, m sobe pelo rank do suavizado entre os valores
    /// positivos distintos da cidade, até 1 + <see cref="AcrescimoMaximo"/>.
    /// </summary>
    public static Dictionary<string, double> Fatores(
        IReadOnlyDictionary<string, double> suavizado, IReadOnlyDictionary<string, string> areaDaCelula, ParametrosScore p)
    {
        var distintos = suavizado.Values.Where(v => v > 0).Distinct().OrderBy(v => v).ToList();
        return suavizado.ToDictionary(kv => kv.Key, kv =>
        {
            var m = kv.Value <= 0 ? 1.0 : 1 + AcrescimoMaximo * (distintos.IndexOf(kv.Value) + 1) / distintos.Count;
            return Math.Round(p.Fator(areaDaCelula[kv.Key]) * m, 4);
        });
    }
}
