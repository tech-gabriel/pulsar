using System.Net;
using FluentAssertions;
using Pulsar.API.External.Clients;
using Pulsar.API.External.Interfaces;

namespace Pulsar.Tests.External;

/// <summary>O HTML é a página real do posto 1000840 (Ipiranga), salva em 2026-11-10.</summary>
public class CgeEstacaoClientTests
{
    private static string Fixture(string nome)
        => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", nome));

    [Fact]
    public void Parse_PaginaReal_LeTodosOsCampos()
    {
        var e = CgeEstacaoClient.Parse(Fixture("cge-estacao-1000840.html"));

        e.Should().Be(new EstacaoCgeBruta(0.0, 0.0, new TimeOnly(10, 0, 0), 17.1, 99.7, "NNE", 10.8, 21.7, 932.9));
    }

    [Fact]
    public void Parse_SemChuvaDoPeriodo_DevolveNull()
        => CgeEstacaoClient.Parse("<html><body>manutenção</body></html>").Should().BeNull();

    [Fact]
    public void Parse_ChuvaPresenteMasSemVento_DevolveLeituraComVentoNull()
    {
        // O que importa (chuva) não pode se perder porque um instrumento secundário sumiu.
        var html = "<td><strong>Per. Atual:</strong></td><td>3.2 mm</td><td><strong>Per. Anterior:</strong></td><td>12.4 mm</td>";

        var e = CgeEstacaoClient.Parse(html)!;

        e.ChuvaPeriodoMm.Should().Be(3.2);
        e.ChuvaPeriodoAnteriorMm.Should().Be(12.4);
        e.VentoKmH.Should().BeNull();
        e.Zeramento.Should().BeNull();
    }

    [Fact]
    public async Task ObterAsync_ChamaAPaginaDoPosto()
    {
        var handler = new HandlerFalso(Fixture("cge-estacao-1000840.html"));
        var client = new CgeEstacaoClient(new FabricaFalsa(handler));

        var e = await client.ObterAsync(1000840);

        e.Should().NotBeNull();
        handler.UriPedida!.ToString().Should().EndWith("estacao.jsp?POSTO=1000840");
    }

    private sealed class HandlerFalso(string corpo) : HttpMessageHandler
    {
        public Uri? UriPedida { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            UriPedida = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(corpo) });
        }
    }

    private sealed class FabricaFalsa(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name)
            => new(handler, disposeHandler: false) { BaseAddress = new Uri("https://www.cgesp.org/v3/") };
    }
}
