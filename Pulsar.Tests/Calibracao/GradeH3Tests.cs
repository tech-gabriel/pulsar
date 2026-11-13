using FluentAssertions;
using Pulsar.API.Domain.Score;
using Pulsar.Calibracao;

namespace Pulsar.Tests.Calibracao;

public class GradeH3Tests
{
    private static readonly DateOnly De = new(2026, 1, 1);
    private static readonly DateOnly Ate = new(2026, 8, 31);
    private static readonly DateOnly Dia = new(2026, 3, 10);

    // Quadrado de 0,04° de lado em torno de (-23,55; -46,60), como o GeoSampa entrega.
    private const string GeojsonMooca = """
        {"type":"FeatureCollection","features":[{"type":"Feature",
         "properties":{"nm_subprefeitura":"MOOCA"},
         "geometry":{"type":"Polygon","coordinates":[[[-46.62,-23.57],[-46.58,-23.57],[-46.58,-23.53],[-46.62,-23.53],[-46.62,-23.57]]]}}]}
        """;

    [Theory]
    [InlineData("M BOI MIRIM", "M'Boi Mirim")]
    [InlineData("SE", "Sé")]
    [InlineData("ARICANDUVA-FORMOSA-CARRAO", "Aricanduva-Formosa-Carrão")]
    public void NomeCanonico_CasaNomesDoGeojson(string doGeojson, string esperado)
        => GradeH3.NomeCanonico(doGeojson).Should().Be(esperado);

    [Fact]
    public void NomeCanonico_NomeDesconhecido_Lanca()
        => FluentActions.Invoking(() => GradeH3.NomeCanonico("XYZ"))
            .Should().Throw<InvalidOperationException>().WithMessage("*XYZ*");

    [Fact]
    public void Celulas_PreenchePoligonoPeloCentro()
    {
        var celulas = GradeH3.Celulas(GeojsonMooca);

        celulas.Count.Should().BeInRange(15, 40);
        celulas.Values.Should().OnlyContain(v => v == "Mooca");
        celulas.Keys.Should().Contain(GradeH3.CelulaDe(-23.55, -46.60));
    }

    [Fact]
    public void Suavizado_SomaAPropriaEMetadeDasVizinhas()
    {
        var a = GradeH3.CelulaDe(-23.55, -46.60);
        var b = GradeH3.Vizinhas(a).First();
        var (latB, lonB) = GradeH3.Centro(b);
        var grade = new HashSet<string> { a, b };

        var s = GradeH3.Suavizado(
        [
            new(-23.55, -46.60, Dia), new(-23.55, -46.60, Dia.AddDays(1)),
            new(latB, lonB, Dia),
            new(-23.55, -46.60, Ate.AddDays(1)),   // fora do período
            new(-22.90, -43.20, Dia),              // fora da grade (Rio de Janeiro)
        ], grade, De, Ate);

        s[a].Should().Be(2.5);
        s[b].Should().Be(2.0);
        s.Should().HaveCount(2);
    }

    [Fact]
    public void Fatores_SemHistoricoUsaOFatorDaArea()
    {
        var f = GradeH3.Fatores(
            new Dictionary<string, double> { ["a"] = 0 },
            new Dictionary<string, string> { ["a"] = "Campo Limpo" },
            CalibracaoScore.Atual);

        f["a"].Should().Be(CalibracaoScore.Atual.Fator("Campo Limpo"));
    }

    [Fact]
    public void Fatores_HistoricoSobeAteOTetoDe25PorCento()
    {
        var area = new Dictionary<string, string> { ["a"] = "Itaquera", ["b"] = "Itaquera", ["c"] = "Itaquera" };
        var f = GradeH3.Fatores(new Dictionary<string, double> { ["a"] = 0, ["b"] = 1, ["c"] = 3 }, area, CalibracaoScore.Atual);

        var daArea = CalibracaoScore.Atual.Fator("Itaquera");
        f["a"].Should().Be(daArea);
        f["b"].Should().BeApproximately(daArea * 1.125, 1e-4);
        f["c"].Should().BeApproximately(daArea * 1.25, 1e-4);
    }

    [Fact]
    public void Pontos_FeicaoSemGeometria_EhPulada()
    {
        const string json = """
            {"features":[
              {"geometry":{"type":"Point","coordinates":[-46.60,-23.55]},"properties":{"dt_ocorrencia":"2026-04-01Z"}},
              {"geometry":null,"properties":{"dt_ocorrencia":"2026-04-02Z"}},
              {"geometry":{"type":"Point","coordinates":[-46.61,-23.56]},"properties":{"dt_ocorrencia":null}}]}
            """;

        var pontos = FonteGeoSampa.Pontos(json);

        pontos.Should().ContainSingle();
        pontos[0].Should().Be(new OcorrenciaPonto(-23.55, -46.60, new DateOnly(2026, 4, 1)));
    }
}
