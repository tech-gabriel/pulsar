using FluentAssertions;
using Pulsar.API.Domain.Chuva;

namespace Pulsar.Tests.Domain;

public class EstacaoChuvaTests
{
    private const double GrauPorKm = 1 / 111.0;

    private static EstacaoChuva A(string cod, double km) => new(cod, -23.5 + km * GrauPorKm, -46.6, 1, 2, 3);

    [Fact]
    public void MaisProxima_EscolheAMaisPertoDentroDoRaio()
        => EstacaoChuva.MaisProxima(-23.5, -46.6, [A("LONGE", 4), A("PERTO", 1), A("MEIO", 2)], raioKm: 5)!.Cod.Should().Be("PERTO");

    [Fact]
    public void MaisProxima_ForaDoRaio_Null()
        => EstacaoChuva.MaisProxima(-23.5, -46.6, [A("A", 6)], raioKm: 5).Should().BeNull();

    [Fact]
    public void MaisProxima_SemEstacoes_Null()
        => EstacaoChuva.MaisProxima(-23.5, -46.6, [], raioKm: 5).Should().BeNull();

    [Fact]
    public void Criar_LeituraBoa_GuardaAsTresJanelas()
        => EstacaoChuva.Criar("A", -23.5, -46.6, 4, 10, 30).Should().Be(new EstacaoChuva("A", -23.5, -46.6, 4, 10, 30));

    // Estação com defeito passaria a mexer no risco do trecho, não só na tela.
    [Theory]
    [InlineData(null, 10.0)]   // sem a última hora
    [InlineData(4.0, null)]    // sem as 3 h
    [InlineData(-1.0, 10.0)]   // negativa
    [InlineData(300.0, 400.0)] // mais do que chove em uma hora
    [InlineData(20.0, 5.0)]    // 1 h maior que 3 h
    public void Criar_LeituraQueNaoServe_Null(double? acc1h, double? acc3h)
        => EstacaoChuva.Criar("A", -23.5, -46.6, acc1h, acc3h, 50).Should().BeNull();

    [Theory]
    [InlineData(null)]
    [InlineData(2.0)] // 48 h menor que 3 h não existe
    public void Criar_48hAusenteOuIncoerente_FicaSemAs48h(double? acc48h)
        => EstacaoChuva.Criar("A", -23.5, -46.6, 4, 10, acc48h)!.Mm48h.Should().BeNull();

    [Fact]
    public void Criar_ArredondamentoEntreJanelas_Aceita()
        => EstacaoChuva.Criar("A", -23.5, -46.6, 10.2, 10.0, 10.0).Should().NotBeNull();
}
