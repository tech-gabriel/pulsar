using FluentAssertions;
using Pulsar.API.Domain.Score;

namespace Pulsar.Tests.Domain;

public class MeioTermoTests
{
    private static double[] Valores(params (int Quantos, double Valor)[] grupos)
        => grupos.SelectMany(g => Enumerable.Repeat(g.Valor, g.Quantos)).ToArray();

    [Fact]
    public void Calcular_UmSextoDaAreaEmRiscoAlto_FicaNoMeio()
        => MeioTermo.Calcular(Valores((50, 10), (10, 85))).Should().BeApproximately(60.0, 1e-9);

    [Fact]
    public void Calcular_AreaInteiraEmRiscoAlto_FicaNoAlto()
        => MeioTermo.Calcular(Valores((60, 85))).Should().Be(85);

    [Fact]
    public void Calcular_UmaCelulaIsolada_QuaseNaoMexe()
        => MeioTermo.Calcular(Valores((59, 10), (1, 85))).Should().BeApproximately(15.0, 1e-9);

    [Fact]
    public void Calcular_SemCelulas_DaZero()
        => MeioTermo.Calcular([]).Should().Be(0);

    [Fact]
    public void Calcular_TresCelulas_UsaSoAMaior()
        => MeioTermo.Calcular([10, 20, 90]).Should().Be(90);
}
