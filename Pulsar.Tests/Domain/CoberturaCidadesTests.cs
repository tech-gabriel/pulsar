using FluentAssertions;
using Pulsar.API.Domain.Cobertura;

namespace Pulsar.Tests.Domain;

/// <summary>
/// Os limites de coordenada por cidade (antes fixos em São Paulo). Cada pessoa só alcança as
/// cidades que enxerga: a Baixada, escondida até o lançamento, só entra para o Admin.
/// </summary>
public class CoberturaCidadesTests
{
    private static readonly string[] SoCapital = ["São Paulo"];
    private static readonly string[] AsDuas = ["São Paulo", "Baixada Santista"];

    [Fact]
    public void Dentro_SantosSoComABaixada()
    {
        CoberturaCidades.Dentro(-23.96, -46.33, SoCapital).Should().BeFalse();
        CoberturaCidades.Dentro(-23.96, -46.33, AsDuas).Should().BeTrue();
    }

    [Theory]
    [InlineData(-23.9608, -46.3336)] // Santos
    [InlineData(-23.9631, -46.3919)] // São Vicente
    [InlineData(-23.9931, -46.2564)] // Guarujá
    [InlineData(-23.8950, -46.4254)] // Cubatão
    [InlineData(-24.0058, -46.4028)] // Praia Grande
    [InlineData(-23.8486, -46.1396)] // Bertioga
    [InlineData(-24.0931, -46.6208)] // Mongaguá
    [InlineData(-24.1831, -46.7889)] // Itanhaém
    [InlineData(-24.3200, -46.9983)] // Peruíbe
    public void Dentro_SedesDasNoveAreas(double lat, double lon)
        => CoberturaCidades.Dentro(lat, lon, ["Baixada Santista"]).Should().BeTrue();

    // Antes LocalSalvoTests: a caixa da capital é a mesma de antes.
    [Theory]
    [InlineData(-23.5614, -46.6559)] // Paulista
    [InlineData(-23.6466, -46.6413)] // Jabaquara
    public void Dentro_Capital(double lat, double lon)
        => CoberturaCidades.Dentro(lat, lon, SoCapital).Should().BeTrue();

    [Theory]
    [InlineData(-22.9056, -47.0608)] // Campinas
    [InlineData(-23.3, -46.53)]      // centro de Guarulhos
    public void Dentro_ForaDasDuas(double lat, double lon)
        => CoberturaCidades.Dentro(lat, lon, AsDuas).Should().BeFalse();

    [Fact]
    public void Dentro_NaN_False()
        => CoberturaCidades.Dentro(double.NaN, -46.6, AsDuas).Should().BeFalse();

    [Fact]
    public void Dentro_CidadeDesconhecida_False()
        => CoberturaCidades.Dentro(-23.55, -46.63, ["Curitiba"]).Should().BeFalse();

    [Fact]
    public void Bbox_SoCapital_IgualAoDeHoje()
        => CoberturaCidades.Bbox(SoCapital).Should().Be("-46.83,-24.01,-46.36,-23.35");

    [Fact]
    public void Bbox_AsDuas_ÉAUniao()
        => CoberturaCidades.Bbox(AsDuas).Should().Be("-47.13,-24.5,-45.79,-23.35");
}
