using FluentAssertions;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.Tests.Domain;

public class CalculadoraScoreTests
{
    // Parâmetros fixos, independentes da calibração: os casos abaixo testam a forma da
    // fórmula, e recalibrar não pode quebrá-los.
    private static readonly ParametrosScore P = new(
        Chuva1h: [new(0, 0), new(5, 30), new(15, 60), new(30, 100)],
        Chuva3h: [new(0, 0), new(15, 30), new(35, 60), new(60, 100)],
        Saturacao48h: [new(20, 0), new(80, 20)],
        Vento: CalibracaoScore.Atual.Vento,
        Calor: CalibracaoScore.Atual.Calor,
        Fatores: new Dictionary<string, double> { ["Alta"] = 1.15, ["Baixa"] = 0.85 });

    [Fact]
    public void CalibracaoAtual_Tempestade20mmH_DaAlto()
        => CalculadoraScore.Calcular(new EntradaScore(20, 20, 20, 0, 20, "Neutra"))
            .Alagamento.Faixa.Should().Be(FaixaRisco.ALTO);

    [Fact]
    public void CalibracaoAtual_TemFatorParaAs32Subprefeituras()
        => CalibracaoScore.Atual.Fatores.Should().HaveCount(32);

    private static ResultadoScore Calc(double c1 = 0, double c3 = 0, double c48 = 0,
        double vento = 0, double sens = 20, string sub = "Neutra")
        => CalculadoraScore.Calcular(new EntradaScore(c1, c3, c48, vento, sens, sub), P);

    [Fact]
    public void SemChuvaSemVentoSemCalor_TudoZeroEPrincipalAlagamento()
    {
        var r = Calc();
        r.Alagamento.Valor.Should().Be(0);
        r.Vento.Valor.Should().Be(0);
        r.Calor.Valor.Should().Be(0);
        r.Principal.Should().Be(TipoPerigo.ALAGAMENTO);
        r.DoPrincipal.Faixa.Should().Be(FaixaRisco.BAIXO);
    }

    [Fact]
    public void Tempestade20mmH_DaAlto()
    {
        // curva1h: 15 -> 60, 30 -> 100; 20 mm => 60 + 40 * 5/15 = 73,33
        var r = Calc(c1: 20, c3: 20);
        r.Alagamento.Valor.Should().BeApproximately(73.33, 0.01);
        r.Alagamento.Faixa.Should().Be(FaixaRisco.ALTO);
    }

    [Fact]
    public void Chuva5mm_EhLimiteDeBaixo()
    {
        Calc(c1: 5).Alagamento.Faixa.Should().Be(FaixaRisco.BAIXO);
        Calc(c1: 5.1).Alagamento.Faixa.Should().Be(FaixaRisco.MODERADO);
    }

    [Fact]
    public void Acumulado3h_MandaQuandoPiorQue1h()
    {
        // 1h = 2 mm (12 pts); 3h = 35 mm (60 pts) => vale o 3h
        Calc(c1: 2, c3: 35).Alagamento.Valor.Should().BeApproximately(60, 0.01);
    }

    [Fact]
    public void SoloEncharcadoSemChuvaAgora_NaoSobe()
    {
        Calc(c48: 120).Alagamento.Valor.Should().Be(0);
    }

    [Fact]
    public void SoloEncharcadoComChuva_SomaBonus()
    {
        // 10 mm/h => 45 pts; 48h = 80 mm => +20 => 65 ALTO
        var r = Calc(c1: 10, c3: 10, c48: 80);
        r.Alagamento.Valor.Should().BeApproximately(65, 0.01);
        r.Alagamento.Faixa.Should().Be(FaixaRisco.ALTO);
    }

    [Fact]
    public void FatorDeSuscetibilidade_Multiplica()
    {
        Calc(c1: 15, sub: "Alta").Alagamento.Valor.Should().BeApproximately(69, 0.01);
        Calc(c1: 15, sub: "Baixa").Alagamento.Valor.Should().BeApproximately(51, 0.01);
    }

    [Fact]
    public void SubprefeituraForaDoDicionario_UsaFatorUm()
    {
        Calc(c1: 15, sub: "Inexistente").Alagamento.Valor.Should().BeApproximately(60, 0.01);
    }

    [Theory]
    [InlineData(40, 30, FaixaRisco.BAIXO)]
    [InlineData(50, 45, FaixaRisco.MODERADO)]
    [InlineData(65, 65, FaixaRisco.ALTO)]
    public void Vento_SegueNiveisInmet(double kmh, double esperado, FaixaRisco faixa)
    {
        var r = Calc(vento: kmh);
        r.Vento.Valor.Should().BeApproximately(esperado, 0.01);
        r.Vento.Faixa.Should().Be(faixa);
    }

    [Theory]
    [InlineData(27, 0, FaixaRisco.BAIXO)]
    [InlineData(32, 30, FaixaRisco.BAIXO)]
    [InlineData(36.5, 45, FaixaRisco.MODERADO)]
    [InlineData(42, 63.08, FaixaRisco.ALTO)]
    public void Calor_SegueIndiceDeCalor(double sens, double esperado, FaixaRisco faixa)
    {
        var r = Calc(sens: sens);
        r.Calor.Valor.Should().BeApproximately(esperado, 0.01);
        r.Calor.Faixa.Should().Be(faixa);
    }

    [Fact]
    public void Principal_EhOPior()
    {
        var r = Calc(c1: 2, vento: 65);
        r.Principal.Should().Be(TipoPerigo.VENTO);
        r.DoPrincipal.Faixa.Should().Be(FaixaRisco.ALTO);
    }

    [Fact]
    public void Empate_FicaComAlagamento()
    {
        // 5 mm/h = 30; vento 40 = 30
        Calc(c1: 5, vento: 40).Principal.Should().Be(TipoPerigo.ALAGAMENTO);
    }

    [Fact]
    public void ValoresAbsurdos_FicamEm0a100SemNaN()
    {
        var r = Calc(c1: 500, c3: 900, c48: 2000, vento: 300, sens: 70, sub: "Alta");
        r.Alagamento.Valor.Should().Be(100);
        r.Vento.Valor.Should().Be(100);
        r.Calor.Valor.Should().Be(100);

        var neg = Calc(c1: -3, c3: -3, c48: -10, vento: -1, sens: -40);
        neg.Alagamento.Valor.Should().Be(0);
        neg.Vento.Valor.Should().Be(0);
        neg.Calor.Valor.Should().Be(0);
    }

    [Theory]
    [InlineData(0, FaixaRisco.BAIXO)]
    [InlineData(30, FaixaRisco.BAIXO)]
    [InlineData(30.01, FaixaRisco.MODERADO)]
    [InlineData(60, FaixaRisco.MODERADO)]
    [InlineData(60.01, FaixaRisco.ALTO)]
    public void ClassificacaoRisco_Cortes(double v, FaixaRisco f)
        => ClassificacaoRisco.Faixa(v).Should().Be(f);
}
