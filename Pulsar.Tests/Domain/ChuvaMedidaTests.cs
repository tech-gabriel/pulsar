using FluentAssertions;
using Pulsar.API.Domain.Chuva;

namespace Pulsar.Tests.Domain;

public class ChuvaMedidaTests
{
    private static readonly DateTime Agora = new(2026, 11, 10, 18, 0, 0, DateTimeKind.Utc);

    private static LeituraPosto L(int minutosAtras, double acumulado, string assinatura = "a")
        => new(Agora.AddMinutes(-minutosAtras), acumulado, assinatura);

    [Fact]
    public void MmNaJanela_AcumuladoSubindo_DevolveADiferenca()
    {
        LeituraPosto[] leituras = [L(30, 2.0), L(15, 5.0), L(0, 9.0)];

        ChuvaMedida.MmNaJanela(leituras, Agora, 30).Should().Be(7.0);
        ChuvaMedida.MmNaJanela(leituras, Agora, 15).Should().Be(4.0);
    }

    [Theory]
    [InlineData(4)]
    [InlineData(7)]
    [InlineData(14)]
    public void MmNaJanela_ConsultaEntreUmCicloEOutro_MedeAPartirDaUltimaLeitura(int idadeDaUltima)
    {
        // É o caso do app: a pessoa abre o detalhe alguns minutos depois da coleta.
        LeituraPosto[] leituras = [L(idadeDaUltima + 30, 2.0), L(idadeDaUltima + 15, 5.0), L(idadeDaUltima, 9.0)];

        ChuvaMedida.MmNaJanela(leituras, Agora, 15).Should().Be(4.0);
        ChuvaMedida.MmNaJanela(leituras, Agora, 30).Should().Be(7.0);
    }

    [Fact]
    public void MmNaJanela_ZeramentoNoMeio_ContaSoOQueChoveuDepois()
    {
        LeituraPosto[] leituras = [L(30, 12.4), L(15, 0.2), L(0, 0.6)];

        ChuvaMedida.MmNaJanela(leituras, Agora, 30).Should().Be(0.6);
    }

    [Fact]
    public void MmNaJanela_SemChuva_DevolveZeroENaoNull()
    {
        LeituraPosto[] leituras = [L(30, 3.0, "a"), L(15, 3.0, "b"), L(0, 3.0, "c")];

        ChuvaMedida.MmNaJanela(leituras, Agora, 30).Should().Be(0.0);
    }

    [Fact]
    public void MmNaJanela_SemLeituraDeBase_DevolveNull()
    {
        LeituraPosto[] leituras = [L(15, 1.0), L(0, 2.0)];

        ChuvaMedida.MmNaJanela(leituras, Agora, 60).Should().BeNull();
    }

    [Fact]
    public void MmNaJanela_BuracoNoMeio_AindaSoma()
    {
        LeituraPosto[] leituras = [L(60, 1.0), L(0, 8.0)];

        ChuvaMedida.MmNaJanela(leituras, Agora, 60).Should().Be(7.0);
    }

    [Fact]
    public void MmNaJanela_UltimaLeituraVelha_DevolveNull()
    {
        LeituraPosto[] leituras = [L(55, 1.0), L(25, 4.0)];

        ChuvaMedida.MmNaJanela(leituras, Agora, 30).Should().BeNull();
    }

    [Fact]
    public void MmNaJanela_SemLeituraNenhuma_DevolveNull()
        => ChuvaMedida.MmNaJanela([], Agora, 30).Should().BeNull();

    [Fact]
    public void MmNaJanela_PostoParado_DevolveNull()
    {
        var leituras = Enumerable.Range(0, 8).Select(i => L(105 - i * 15, 3.0)).ToList();

        ChuvaMedida.MmNaJanela(leituras, Agora, 30).Should().BeNull();
    }

    [Fact]
    public void Parado_ChuvaIgualMasOutroInstrumentoMudou_NaoEstaParado()
    {
        var leituras = Enumerable.Range(0, 8).Select(i => L(105 - i * 15, 3.0, $"t{i}")).ToList();

        ChuvaMedida.Parado(leituras).Should().BeFalse();
    }

    [Fact]
    public void Parado_MenosLeiturasQueOMinimo_NaoEstaParado()
    {
        LeituraPosto[] leituras = [L(30, 3.0), L(15, 3.0), L(0, 3.0)];

        ChuvaMedida.Parado(leituras).Should().BeFalse();
    }
}
