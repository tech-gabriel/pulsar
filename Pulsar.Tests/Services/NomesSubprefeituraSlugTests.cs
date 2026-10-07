using FluentAssertions;
using Pulsar.API.Services.Notificacoes;

namespace Pulsar.Tests.Services;

public class NomesSubprefeituraSlugTests
{
    // Espelho de slugify em pulsar-web/src/data/regioes-seo.ts: se divergir, o push abre o
    // mapa sem a subprefeitura (o deep link não casa e é ignorado em silêncio).
    [Theory]
    [InlineData("Sé", "se")]
    [InlineData("M'Boi Mirim", "mboi-mirim")]
    [InlineData("Santana/Tucuruvi", "santana-tucuruvi")]
    [InlineData("Aricanduva-Formosa-Carrão", "aricanduva-formosa-carrao")]
    [InlineData("Cidade Tiradentes", "cidade-tiradentes")]
    public void Slug_IgualAoDoFront(string nome, string esperado)
        => NomesSubprefeitura.Slug(nome).Should().Be(esperado);

    [Fact]
    public void UrlDetalhe_AbreOMapaNaSubprefeitura()
        => NomesSubprefeitura.UrlDetalhe("M'Boi Mirim").Should().Be("/app?regiao=mboi-mirim");
}
