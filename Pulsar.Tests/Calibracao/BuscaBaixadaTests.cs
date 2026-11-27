using FluentAssertions;
using Pulsar.Calibracao;

namespace Pulsar.Tests.Calibracao;

public class BuscaBaixadaTests
{
    private static readonly DateOnly De = new(2026, 1, 1);
    private static readonly DateOnly Ate = De.AddDays(59);

    /// <summary>60 dias secos, com uma hora de <paramref name="mm"/> ao meio-dia nos dias pedidos (1 = primeiro dia).</summary>
    private static List<HoraClima> Serie(double mm, params int[] dias)
        => Enumerable.Range(0, 60 * 24).Select(h =>
        {
            var hora = De.ToDateTime(TimeOnly.MinValue).AddHours(h);
            var chove = hora.Hour == 12 && dias.Contains(h / 24 + 1);
            return new HoraClima(hora, chove ? mm : 0, 5, 22, 0, 10);
        }).ToList();

    private static Dictionary<string, HashSet<DateOnly>> Ocorrencias(params (string area, int dia)[] xs)
        => xs.GroupBy(x => x.area).ToDictionary(g => g.Key, g => g.Select(x => De.AddDays(x.dia - 1)).ToHashSet());

    // Santos: 8,1 mm só nos dias documentados, ALTO só com k até 1,0.
    // Cubatão: 8 mm em 6 dos 60 dias (10%), sem alagamento documentado: com k 1,0 passa da trava.
    private static readonly Dictionary<string, List<HoraClima>> Series = new()
    {
        ["Santos"] = Serie(8.1, 10, 30),
        ["Cubatão"] = Serie(8.0, 2, 4, 6, 8, 12, 14),
    };
    private static readonly Dictionary<string, HashSet<DateOnly>> Docs = Ocorrencias(("Santos", 10), ("Santos", 30));

    [Fact]
    public void Baixada_RespeitaATravaEmTodasAsAreas()
    {
        var e = Busca.Baixada(Series, Docs, De, Ate);

        e.PctDiasAltoPorArea.Keys.Should().BeEquivalentTo(Series.Keys);
        e.PctDiasAltoPorArea.Values.Should().OnlyContain(p => p <= Busca.MaxPctDiasAlto);
        e.Vencedor.Metricas.Cobertura.Should().Be(1);
    }

    [Fact]
    public void Baixada_AreaChuvosa_GanhaFatorMenor()
    {
        var e = Busca.Baixada(Series, Docs, De, Ate);

        e.Fatores["Cubatão"].Should().BeLessThan(1.0).And.BeGreaterThanOrEqualTo(0.85);
        e.Fatores["Santos"].Should().Be(1.0);
    }

    [Fact]
    public void Baixada_SemCombinacaoNaTrava_FalhaComONomeDaArea()
    {
        var impossivel = new Dictionary<string, List<HoraClima>>
        {
            ["Santos"] = Serie(8.1, 10, 30),
            ["Cubatão"] = Serie(100, Enumerable.Range(1, 20).Select(d => d * 3).ToArray()),
        };

        FluentActions.Invoking(() => Busca.Baixada(impossivel, Docs, De, Ate))
            .Should().Throw<InvalidOperationException>().WithMessage("*Cubatão*");
    }
}
