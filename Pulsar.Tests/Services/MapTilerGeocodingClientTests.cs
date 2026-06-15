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
}
