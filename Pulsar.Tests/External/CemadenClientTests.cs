using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.External;

/// <summary>Os JSON são recortes das respostas reais do PED do CEMADEN, salvas em 2026-11-11.</summary>
public class CemadenClientTests
{
    private const string Email = "alguem@exemplo.test";
    private const string Senha = "segredo-de-teste";

    private static string Fixture(string nome)
        => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", nome));

    [Fact]
    public void ParseAcumulados_RespostaReal_LeTodasAsJanelas()
    {
        var lista = CemadenClient.ParseAcumulados(Fixture("cemaden-acumulados.json"));

        lista.Should().HaveCount(3);
        var butanta = lista.Single(a => a.CodEstacao == "355030846A");
        butanta.Should().BeEquivalentTo(new
        {
            Acc1h = 1.4, Acc3h = 2.8, Acc6h = 3.0, Acc12h = 3.2, Acc24h = 5.6,
            Acc48h = 7.0, Acc72h = 8.0, Acc96h = 11.69, Acc120h = 21.54,
        });
        butanta.DataHoraUtc.Should().Be(new DateTime(2026, 11, 11, 20, 13, 53, DateTimeKind.Utc).AddTicks(1092850));
        butanta.DataHoraUtc.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void ParseAcumulados_JanelaNula_FicaNullENaoZero()
    {
        var jaragua = CemadenClient.ParseAcumulados(Fixture("cemaden-acumulados.json")).Single(a => a.CodEstacao == "355030851A");

        jaragua.Acc1h.Should().BeNull();
        jaragua.Acc24h.Should().BeNull();
        jaragua.Acc72h.Should().Be(0);
    }

    [Fact]
    public void ParseAcumulados_ItemSemCodestacaoOuDataInvalida_EDescartado()
    {
        var json = """
            [{"acc1hr": 1, "datahora": "2026-11-11T20:13:53"},
             {"acc1hr": 2, "codestacao": "A", "datahora": "ontem"},
             {"acc1hr": 3, "codestacao": "B", "datahora": "2026-11-11T20:13:53"},
             "lixo"]
            """;

        CemadenClient.ParseAcumulados(json).Select(a => a.CodEstacao).Should().Equal("B");
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("")]
    [InlineData("<html>503 Service Unavailable</html>")]
    public void ParseAcumulados_JsonQueNaoELista_DevolveVazio(string corpo)
        => CemadenClient.ParseAcumulados(corpo).Should().BeEmpty();

    [Fact]
    public void ParseCadastro_RespostaReal_LeNomeECoordenadaEDescartaSemCoordenada()
    {
        var lista = CemadenClient.ParseCadastro(Fixture("cemaden-cadastro.json"));

        lista.Select(c => c.CodEstacao).Should().BeEquivalentTo("355030851A", "355030846A");
        lista.Single(c => c.CodEstacao == "355030846A").Should().BeEquivalentTo(
            new { Nome = "Butantã", Latitude = -23.589, Longitude = -46.738 });
    }

    [Fact]
    public async Task ObterAcumulados_DuasChamadas_PedeTokenUmaVez()
    {
        var rede = new RedeFalsa();
        var client = Cliente(rede);

        (await client.ObterAcumuladosAsync("3550308")).Should().HaveCount(3);
        await client.ObterAcumuladosAsync("3550308");

        rede.PedidosDeToken.Should().Be(1);
        rede.PedidosDeDados.Should().Be(2);
        rede.UltimoTokenEnviado.Should().Be("tok-1");
        rede.UltimaUrlDeDados.Should().EndWith("pcds-acum/acumulados-recentes?codibge=3550308");
    }

    [Fact]
    public async Task ObterAcumulados_401_RenovaETentaDeNovoUmaVez()
    {
        var rede = new RedeFalsa { Respostas401 = 1 };

        (await Cliente(rede).ObterAcumuladosAsync("3550308")).Should().HaveCount(3);

        rede.PedidosDeToken.Should().Be(2);
        rede.PedidosDeDados.Should().Be(2);
        rede.UltimoTokenEnviado.Should().Be("tok-2");
    }

    [Fact]
    public async Task ObterAcumulados_401DuasVezes_LancaSemCitarCredencial()
    {
        var rede = new RedeFalsa { Respostas401 = 2 };

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => Cliente(rede).ObterAcumuladosAsync("3550308"));

        ex.ToString().Should().NotContain(Email).And.NotContain(Senha).And.NotContain("tok-");
        rede.PedidosDeDados.Should().Be(2);
    }

    [Fact]
    public async Task ObterAcumulados_LoginRecusado_LancaSemCitarCredencial()
    {
        var rede = new RedeFalsa { LoginRecusado = true };

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => Cliente(rede).ObterAcumuladosAsync("3550308"));

        ex.ToString().Should().NotContain(Email).And.NotContain(Senha);
        rede.PedidosDeDados.Should().Be(0);
    }

    [Theory]
    [InlineData(null, Senha)]
    [InlineData(Email, "")]
    public void Configurado_SemEmailOuSenha_EFalse(string? email, string? senha)
        => Cliente(new RedeFalsa(), email, senha).Configurado.Should().BeFalse();

    [Fact]
    public void Configurado_ComEmailESenha_ETrue()
        => Cliente(new RedeFalsa()).Configurado.Should().BeTrue();

    private static CemadenClient Cliente(RedeFalsa rede, string? email = Email, string? senha = Senha)
    {
        var fabrica = new Mock<IHttpClientFactory>();
        fabrica.Setup(f => f.CreateClient("cemaden-token"))
            .Returns(() => new HttpClient(rede, disposeHandler: false) { BaseAddress = new Uri("https://sgaa.exemplo.test/SGAA/rest/") });
        fabrica.Setup(f => f.CreateClient("cemaden-ped"))
            .Returns(() => new HttpClient(rede, disposeHandler: false) { BaseAddress = new Uri("https://sws.exemplo.test/PED/rest/") });
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Cemaden:Email"] = email,
            ["Cemaden:Senha"] = senha,
        }).Build();
        return new CemadenClient(fabrica.Object, config);
    }

    /// <summary>Faz o papel do SGAA (token) e do PED (dados) sem rede.</summary>
    private sealed class RedeFalsa : HttpMessageHandler
    {
        public int Respostas401 { get; set; }
        public bool LoginRecusado { get; set; }
        public int PedidosDeToken { get; private set; }
        public int PedidosDeDados { get; private set; }
        public string? UltimoTokenEnviado { get; private set; }
        public string? UltimaUrlDeDados { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            if (request.Method == HttpMethod.Post)
            {
                PedidosDeToken++;
                var corpo = await request.Content!.ReadAsStringAsync(ct);
                corpo.Should().Contain(Email).And.Contain("\"password\"");
                return LoginRecusado
                    ? new HttpResponseMessage(HttpStatusCode.Unauthorized) { Content = new StringContent($"usuario {Email} invalido") }
                    : Json($$"""{"token": "tok-{{PedidosDeToken}}", "timeToExp": 13200}""");
            }

            PedidosDeDados++;
            UltimoTokenEnviado = request.Headers.GetValues("token").Single();
            UltimaUrlDeDados = request.RequestUri!.ToString();
            return PedidosDeDados <= Respostas401
                ? new HttpResponseMessage(HttpStatusCode.Unauthorized)
                : Json(Fixture("cemaden-acumulados.json"));
        }

        private static HttpResponseMessage Json(string corpo)
            => new(HttpStatusCode.OK) { Content = new StringContent(corpo, System.Text.Encoding.UTF8, "application/json") };
    }
}
