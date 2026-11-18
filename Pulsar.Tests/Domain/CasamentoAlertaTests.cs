using FluentAssertions;
using Pulsar.API.Domain.Alertas;

namespace Pulsar.Tests.Domain;

public class CasamentoAlertaTests
{
    private static readonly Guid Se = Guid.NewGuid(), Mooca = Guid.NewGuid(), Santos = Guid.NewGuid();

    // Centros de trecho de verdade, arredondados: Sé no centro, Mooca a leste, Santos no litoral.
    private static readonly IReadOnlyList<AreaParaCasar> Areas =
    [
        new(Se, "3550308", [(-23.548, -46.636), (-23.552, -46.630)]),
        new(Mooca, "3550308", [(-23.560, -46.580), (-23.556, -46.575)]),
        new(Santos, "3548500", [(-23.960, -46.333), (-23.965, -46.320)]),
    ];

    private static AlertaCap Alerta(IReadOnlyList<IReadOnlyList<(double, double)>> poligonos, params string[] ibge)
        => new("1/2026", "CENAD-SEDEC", DateTime.UtcNow, "Alert", [], "CHUVAS INTENSAS", "Severe", "Expected",
            DateTime.UtcNow, DateTime.UtcNow.AddHours(2), "Defesa Civil Estadual De São Paulo", "t", "d", poligonos, ibge);

    // Retângulo em volta do centro (Sé), sem chegar à Mooca.
    private static readonly IReadOnlyList<(double, double)> SobreASe =
        [(-23.58, -46.67), (-23.58, -46.60), (-23.52, -46.60), (-23.52, -46.67), (-23.58, -46.67)];

    [Fact]
    public void Poligono_AtingeAAreaComTrechoDentro()
        => CasamentoAlerta.Areas(Alerta([SobreASe]), Areas).Should().Equal(Se);

    [Fact]
    public void GeocodeDeSantos_AtingeSoSantos()
        => CasamentoAlerta.Areas(Alerta([], "3548500"), Areas).Should().Equal(Santos);

    // O código da capital vale para a cidade inteira.
    [Fact]
    public void GeocodeDaCapital_AtingeTodasAsAreasDaCapital()
        => CasamentoAlerta.Areas(Alerta([], "3550308"), Areas).Should().BeEquivalentTo([Se, Mooca]);

    [Fact]
    public void PoligonoNoInterior_NaoAtingeNada()
        => CasamentoAlerta.Areas(Alerta([[(-20.97, -50.63), (-21.06, -50.47), (-20.87, -50.22), (-20.97, -50.63)]]), Areas)
            .Should().BeEmpty();

    [Fact]
    public void GeocodeEPoligono_JuntamSemRepetir()
        => CasamentoAlerta.Areas(Alerta([SobreASe], "3548500", "3548500"), Areas).Should().BeEquivalentTo([Se, Santos]);

    // O feed traz polígonos do Brasil inteiro, com centenas de milhares de vértices, e quase nenhum
    // perto de uma área do Pulsar: o longe precisa ser descartado sem percorrer vértice por vértice.
    [Fact]
    public void PoligonosLonge_SaoDescartadosSemCustoPorVertice()
    {
        var areas = Enumerable.Range(0, 32)
            .Select(i => new AreaParaCasar(Guid.NewGuid(), null,
                [.. Enumerable.Range(0, 100).Select(j => (-23.5 - i * 0.01, -46.6 - j * 0.001))]))
            .ToList();
        // Cem polígonos na Amazônia, cada um com 2.000 vértices.
        var longe = Enumerable.Range(0, 100)
            .Select(k => (IReadOnlyList<(double, double)>)[.. Enumerable.Range(0, 2000)
                .Select(v => (-3.0 + Math.Sin(v * Math.PI / 1000) + k * 0.01, -60.0 + Math.Cos(v * Math.PI / 1000)))])
            .ToList();

        var relogio = System.Diagnostics.Stopwatch.StartNew();
        var atingidas = CasamentoAlerta.Areas(Alerta(longe), areas);
        relogio.Stop();

        atingidas.Should().BeEmpty();
        relogio.ElapsedMilliseconds.Should().BeLessThan(300);
    }
}
