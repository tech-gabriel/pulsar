using FluentAssertions;
using Pulsar.API.Domain.Enums;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.External;

public class GeoSampaClientTests
{
    // GeoJSON real (WGS84, srsName=EPSG::4326): coordenadas na ordem [lon, lat].
    private const string GeoJsonExemplo = """
    {"type":"FeatureCollection","features":[
      {"type":"Feature","id":"risco_ocorrencia_alagamento.1458",
       "geometry":{"type":"Point","coordinates":[-46.5368208,-23.60621642]},
       "properties":{"cd_identificador":"1458","dt_ocorrencia":"2026-04-01Z",
         "dc_tipo_ocorrencia":"ALAGAMENTO","nm_subprefeitura":"VP - VILA PRUDENTE",
         "dt_carga":"2026-07-03Z","sg_fonte_original":"SIGRC"}},
      {"type":"Feature","id":"risco_ocorrencia_alagamento.1472",
       "geometry":{"type":"Point","coordinates":[-46.539,-23.6069]},
       "properties":{"cd_identificador":"1472","dt_ocorrencia":"2026-04-02Z",
         "dc_tipo_ocorrencia":"ALAGAMENTO","nm_subprefeitura":"VP - VILA PRUDENTE",
         "dt_carga":"2026-07-03Z","sg_fonte_original":"SIGRC"}}
    ],"totalFeatures":2,"crs":{"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}}}
    """;

    [Fact]
    public void ParseOcorrencias_MapeiaCoordenadasLonLatParaLatLon()
    {
        var lista = GeoSampaClient.ParseOcorrencias(GeoJsonExemplo, TipoOcorrenciaAlagamento.ALAGAMENTO);

        lista.Should().HaveCount(2);
        var primeira = lista.First(o => o.CdIdentificador == "1458");
        primeira.Latitude.Should().BeApproximately(-23.60621642, 1e-6);
        primeira.Longitude.Should().BeApproximately(-46.5368208, 1e-6);
    }

    [Fact]
    public void ParseOcorrencias_MapeiaCamposEDefineTipo()
    {
        var o = GeoSampaClient.ParseOcorrencias(GeoJsonExemplo, TipoOcorrenciaAlagamento.INUNDACAO).First();

        o.Tipo.Should().Be(TipoOcorrenciaAlagamento.INUNDACAO);
        o.NmSubprefeitura.Should().Be("VP - VILA PRUDENTE");
        o.FonteOriginal.Should().Be("SIGRC");
    }

    [Fact]
    public void ParseOcorrencias_DataOcorrencia_EhUtc()
    {
        var o = GeoSampaClient.ParseOcorrencias(GeoJsonExemplo, TipoOcorrenciaAlagamento.ALAGAMENTO)
            .First(x => x.CdIdentificador == "1458");

        o.DataOcorrencia.Should().Be(new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc));
        o.DataOcorrencia.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void ParseOcorrencias_JsonVazio_RetornaListaVazia()
    {
        GeoSampaClient.ParseOcorrencias("", TipoOcorrenciaAlagamento.ALAGAMENTO).Should().BeEmpty();
    }

    [Fact]
    public void ParseOcorrencias_FeatureSemGeometria_EhIgnorada()
    {
        var json = """
        {"type":"FeatureCollection","features":[
          {"type":"Feature","geometry":null,
           "properties":{"cd_identificador":"9","dt_ocorrencia":"2026-01-01Z",
             "dt_carga":"2026-01-01Z","sg_fonte_original":"SIGRC"}}
        ]}
        """;
        GeoSampaClient.ParseOcorrencias(json, TipoOcorrenciaAlagamento.ALAGAMENTO).Should().BeEmpty();
    }
}
