using FluentAssertions;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

/// <summary>Cada aviso dispara no caso dele e fica quieto no vizinho logo abaixo do limite.</summary>
public class AvaliadorQualidadeTests
{
    private static readonly DateOnly Dia = new(2026, 10, 26);

    private static IEnumerable<string> Tipos(
        double? owm = 0, double? om = 0, int? incompletas = 0, bool alerta = false, int? cgeNaCidade = 0)
        => AvaliadorQualidade.Avaliar(new DiaQualidade(Dia, owm, om, 0, incompletas, 0, alerta, cgeNaCidade)).Select(a => a.Tipo);

    [Fact]
    public void ChuvaNaoAconteceu_Dispara_ComVinteMmContraSeis()
        => Tipos(owm: 20, om: 4.9).Should().Contain(AvaliadorQualidade.ChuvaNaoAconteceu);

    [Fact]
    public void ChuvaNaoAconteceu_NaoDispara_AbaixoDeVinteMm()
        => Tipos(owm: 19.9, om: 0).Should().BeEmpty();

    [Fact]
    public void ChuvaNaoAconteceu_NaoDispara_QuandoAsFontesConcordam()
        => Tipos(owm: 40, om: 10).Should().BeEmpty();

    [Fact]
    public void ChuvaNaoAconteceu_NaoDispara_ComAlagamentoNaCidade()
        => Tipos(owm: 67, om: 6.3, cgeNaCidade: 7).Should().BeEmpty();

    [Fact]
    public void ChuvaNaoAconteceu_NaoDispara_AntesDeGuardarmosOCge()
        => Tipos(owm: 67, om: 6.3, cgeNaCidade: null).Should().BeEmpty();

    [Fact]
    public void ChuvaPassouBatida_Dispara_QuandoOPulsarMarcaMenosDeUmQuarto()
        => Tipos(owm: 4.9, om: 20).Should().Equal(AvaliadorQualidade.ChuvaPassouBatida);

    [Fact]
    public void ChuvaPassouBatida_NaoDispara_ComUmQuartoExato()
        => Tipos(owm: 5, om: 20).Should().BeEmpty();

    [Fact]
    public void AlertaSemConfirmacao_Dispara_SemCgeEComPoucaChuva()
        => Tipos(om: 9.9, alerta: true).Should().Equal(AvaliadorQualidade.AlertaSemConfirmacao);

    [Fact]
    public void AlertaSemConfirmacao_NaoDispara_ComAlagamentoNaCidade()
        => Tipos(om: 0, alerta: true, cgeNaCidade: 1).Should().BeEmpty();

    [Fact]
    public void AlertaSemConfirmacao_NaoDispara_QuandoChoveuDeVerdade()
        => Tipos(owm: 10, om: 10, alerta: true).Should().BeEmpty();

    [Fact]
    public void ColetaFalhando_Dispara_ComCincoHorasIncompletas()
        => Tipos(incompletas: 5).Should().Equal(AvaliadorQualidade.ColetaFalhando);

    [Fact]
    public void ColetaFalhando_NaoDispara_ComQuatroHoras()
        => Tipos(incompletas: 4).Should().BeEmpty();

    [Fact]
    public void SemOpenMeteo_SoOsAvisosQueNaoDependemDeleContinuam()
        => Tipos(owm: 80, om: null, alerta: true, incompletas: 6).Should().Equal(AvaliadorQualidade.ColetaFalhando);

    [Fact]
    public void Detalhe_TrazAsDuasFontesEmPtBr()
        => AvaliadorQualidade.Avaliar(new DiaQualidade(Dia, 46.25, 3.1, 0, 0, 0, false, 0))
            .Single().Detalhe.Should().Be("Pulsar 46,3 mm, Open-Meteo 3,1 mm");
}
