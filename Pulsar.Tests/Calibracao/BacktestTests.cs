using FluentAssertions;
using Pulsar.Calibracao;

namespace Pulsar.Tests.Calibracao;

public class BacktestTests
{
    private static readonly DateOnly D1 = new(2026, 1, 1);

    private static Dictionary<string, HashSet<DateOnly>> Dias(params (string sub, int dia)[] xs)
        => xs.GroupBy(x => x.sub).ToDictionary(g => g.Key, g => g.Select(x => D1.AddDays(x.dia - 1)).ToHashSet());

    [Fact]
    public void Entradas_SomaJanelasDe1h3hE48h()
    {
        var serie = Enumerable.Range(0, 50)
            .Select(h => new HoraClima(new DateTime(2026, 1, 1).AddHours(h), ChuvaMm: 1, 10, 25, 0, 10))
            .ToList();

        var ultima = Backtest.Entradas("Sé", serie).Last();

        ultima.Chuva1hMm.Should().Be(1);
        ultima.Chuva3hMm.Should().Be(3);
        ultima.Chuva48hMm.Should().Be(48);
        ultima.VentoKmH.Should().Be(10);
        ultima.SensacaoC.Should().Be(25);
        ultima.Subprefeitura.Should().Be("Sé");
    }

    [Fact]
    public void Entradas_NoComecoDaSerie_SomaSoOQueExiste()
    {
        var serie = new List<HoraClima> { new(new DateTime(2026, 1, 1), 4, 0, 20, 0, 10) };
        var e = Backtest.Entradas("Sé", serie).Single();
        e.Chuva3hMm.Should().Be(4);
        e.Chuva48hMm.Should().Be(4);
    }

    [Fact]
    public void Avaliar_OcorrenciaNoDiaSeguinteContaComoAcerto()
    {
        var previstos = Dias(("A", 5));
        var ocorrencias = Dias(("A", 6));

        var m = Backtest.Avaliar(previstos, ocorrencias, D1, D1.AddDays(9));

        m.Precisao.Should().Be(1);
        m.Cobertura.Should().Be(1);
        m.F1.Should().Be(1);
    }

    [Fact]
    public void Avaliar_ContaFalsoAlarmeEPerda()
    {
        // previu dia 2 (nada aconteceu em 2 nem 3) e dia 5 (aconteceu); perdeu o dia 8.
        var previstos = Dias(("A", 2), ("A", 5));
        var ocorrencias = Dias(("A", 5), ("A", 8));

        var m = Backtest.Avaliar(previstos, ocorrencias, D1, D1.AddDays(9));

        m.Precisao.Should().Be(0.5);
        m.Cobertura.Should().Be(0.5);
        m.F1.Should().Be(0.5);
        m.PctDiasAlto.Should().BeApproximately(2.0 / 10, 1e-9);
    }

    [Fact]
    public void Avaliar_SemNenhumaPrevisao_NaoDividePorZero()
    {
        var m = Backtest.Avaliar(new Dictionary<string, HashSet<DateOnly>>(), Dias(("A", 3)), D1, D1.AddDays(9));
        m.Precisao.Should().Be(0);
        m.F1.Should().Be(0);
    }

    [Fact]
    public void Fatores_VaoDe085a115PorRank()
    {
        var f = Busca.Fatores(new Dictionary<string, int> { ["A"] = 0, ["B"] = 10, ["C"] = 50 });
        f["A"].Should().BeApproximately(0.85, 1e-9);
        f["B"].Should().BeApproximately(1.00, 1e-9);
        f["C"].Should().BeApproximately(1.15, 1e-9);
    }
}
