using FluentAssertions;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.Services;

/// <summary>
/// Testes do parser da FeatureCollection do MapTiler (sem chamadas de rede).
/// </summary>
public class MapTilerGeocodingClientTests
{
    [Fact]
    public void ParseFeatureCollection_ExtraiDescricaoECoordenadas()
    {
        const string json = """
        {
          "type": "FeatureCollection",
          "features": [
            { "place_name": "Avenida Paulista, Bela Vista, São Paulo", "center": [-46.656, -23.561] },
            { "place_name": "Rua Augusta, São Paulo", "center": [-46.66, -23.55] }
          ]
        }
        """;

        var resultado = MapTilerGeocodingClient.ParseFeatureCollection(json);

        resultado.Should().HaveCount(2);
        resultado[0].Descricao.Should().Be("Avenida Paulista, Bela Vista, São Paulo");
        // O MapTiler devolve [lon, lat]; o parser inverte para (lat, lon).
        resultado[0].Latitude.Should().Be(-23.561);
        resultado[0].Longitude.Should().Be(-46.656);
    }

    [Fact]
    public void ParseFeatureCollection_ExtraiNomeETipoDePoi()
    {
        const string json = """
        {
          "features": [
            {
              "text": "Shopping Eldorado",
              "place_name": "Shopping Eldorado, Avenida Rebouças 3970, São Paulo",
              "place_type": ["poi"],
              "center": [-46.6958, -23.5726]
            }
          ]
        }
        """;

        var resultado = MapTilerGeocodingClient.ParseFeatureCollection(json);

        resultado.Should().HaveCount(1);
        resultado[0].Nome.Should().Be("Shopping Eldorado");
        resultado[0].Tipo.Should().Be("poi");
        resultado[0].Descricao.Should().Be("Shopping Eldorado, Avenida Rebouças 3970, São Paulo");
    }

    [Fact]
    public void ParseFeatureCollection_SemTextOuPlaceType_NomeCaiParaDescricaoETipoVazio()
    {
        const string json = """
        { "features": [
            { "place_name": "Rua Augusta, São Paulo", "center": [-46.66, -23.55] }
        ] }
        """;

        var resultado = MapTilerGeocodingClient.ParseFeatureCollection(json);

        resultado.Should().HaveCount(1);
        resultado[0].Nome.Should().Be("Rua Augusta, São Paulo");
        resultado[0].Tipo.Should().BeEmpty();
    }

    [Fact]
    public void ParseFeatureCollection_IgnoraFeatureSemCentroOuNome()
    {
        const string json = """
        { "features": [
            { "place_name": "Sem centro" },
            { "center": [-46.6, -23.5] },
            { "place_name": "Válida", "center": [-46.6, -23.5] }
        ] }
        """;

        var resultado = MapTilerGeocodingClient.ParseFeatureCollection(json);

        resultado.Should().HaveCount(1);
        resultado[0].Descricao.Should().Be("Válida");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("{}")]
    [InlineData("{\"features\":[]}")]
    public void ParseFeatureCollection_VazioOuSemFeatures_RetornaVazio(string json)
        => MapTilerGeocodingClient.ParseFeatureCollection(json).Should().BeEmpty();

    // O endereço reverso só nomeia o destino se estiver perto do ponto, e vale o mais perto (não o primeiro).
    [Fact]
    public void RuaMaisPerto_EntreVarios_FicaComOMaisPerto()
    {
        var r = MapTilerGeocodingClient.RuaMaisPerto(
        [
            new("Rua Irene", -23.5590, -46.5990, "Rua Irene", "address"),
            new("Rua do Oratório", -23.5562, -46.5990, "Rua do Oratório", "address"),
        ], -23.5560, -46.5990);
        r!.Nome.Should().Be("Rua do Oratório");
        r.Metros.Should().BeLessThan(30);
    }

    [Fact]
    public void RuaMaisPerto_TodosLonge_ENull()
        => MapTilerGeocodingClient.RuaMaisPerto([new("Rua Longe", -23.5660, -46.5990, "Rua Longe", "address")], -23.5560, -46.5990)
            .Should().BeNull();
}
