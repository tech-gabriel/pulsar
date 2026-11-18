using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.External;

public class IdapClientTests
{
    private static Stream Amostra()
        => File.OpenRead(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", "idap-amostra.xml"));

    [Fact]
    public void Parse_LeAsEntradasValidas()
    {
        var alertas = IdapClient.Parse(Amostra());

        // A entrada sem <info> cai; as outras quatro ficam.
        alertas.Select(a => a.Identificador).Should().Equal("198620/2026", "198700/2026", "198701/2026", "198702/2026");
        var capital = alertas.Single(a => a.Identificador == "198700/2026");
        capital.Evento.Should().Be("CHUVAS INTENSAS");
        capital.Gravidade.Should().Be("Severe");
        capital.Urgencia.Should().Be("Expected");
        capital.TipoMensagem.Should().Be("Alert");
        capital.InicioUtc.Should().Be(new DateTime(2026, 11, 18, 17, 5, 0, DateTimeKind.Utc));
        capital.ExpiraUtc.Should().Be(new DateTime(2026, 11, 18, 20, 0, 0, DateTimeKind.Utc));
        capital.Emissor.Should().Be("Defesa Civil Estadual De São Paulo");
        capital.Titulo.Should().StartWith("Defesa Civil:14h05");
        capital.Poligonos.Should().ContainSingle().Which.Should().HaveCount(5);
        capital.Poligonos[0][0].Should().Be((-23.58, -46.67));
        capital.CodigosIbge.Should().BeEmpty();
    }

    [Fact]
    public void Parse_Cancel_TrazAReferencia()
    {
        var cancel = IdapClient.Parse(Amostra()).Single(a => a.Identificador == "198702/2026");

        cancel.TipoMensagem.Should().Be("Cancel");
        cancel.Referencias.Should().Contain("198700/2026");
    }

    [Fact]
    public void Parse_GeocodeIbge()
        => IdapClient.Parse(Amostra()).Single(a => a.Identificador == "198701/2026")
            .CodigosIbge.Should().Equal("3548500");

    // Exercício, teste de sistema ou alerta restrito não são alertas à população.
    [Theory]
    [InlineData("Exercise", "Public")]
    [InlineData("Test", "Public")]
    [InlineData("Actual", "Restricted")]
    public void Parse_SoActualEPublic(string status, string scope)
    {
        var xml = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", "idap-amostra.xml"))
            .Replace("<status>Actual</status>", $"<status>{status}</status>")
            .Replace("<scope>Public</scope>", $"<scope>{scope}</scope>");

        IdapClient.Parse(new MemoryStream(Encoding.UTF8.GetBytes(xml))).Should().BeEmpty();
    }

    // Uma entrada quebrada no meio de um feed de 13 MB não pode levar as outras junto.
    [Fact]
    public void Parse_EntradaComDataInvalida_DescartaSoEla()
    {
        var xml = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", "idap-amostra.xml"))
            .Replace("<expires>2026-11-18T14:50:00-03:00</expires>", "<expires>ontem</expires>");

        IdapClient.Parse(new MemoryStream(Encoding.UTF8.GetBytes(xml)))
            .Select(a => a.Identificador).Should().Equal("198700/2026", "198701/2026", "198702/2026");
    }

    private sealed class Falha : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
            => throw new HttpRequestException("fora do ar");
    }

    private sealed class Fabrica(HttpMessageHandler h) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(h) { BaseAddress = new Uri("https://idapfile.mdr.gov.br/") };
    }

    [Fact]
    public async Task ObterAsync_FalhaDeRede_DevolveNull()
    {
        var client = new IdapClient(new Fabrica(new Falha()), NullLogger<IdapClient>.Instance);

        (await client.ObterAsync()).Should().BeNull();
    }
}
