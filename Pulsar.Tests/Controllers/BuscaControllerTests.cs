using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>
/// Testes de integração de GET /api/busca/enderecos: autorização, validação do
/// termo e payload (com FakeGeocodingClient, sem rede).
/// </summary>
public class BuscaControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly PulsarWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public BuscaControllerTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task BuscarEnderecos_SemToken_Retorna401()
    {
        var response = await _client.GetAsync("/api/busca/enderecos?q=paulista");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task BuscarEnderecos_SemQuery_Retorna400()
    {
        var token = await TokenAsync();
        var response = await EnviarAsync("/api/busca/enderecos", token);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BuscarEnderecos_TermoCurto_Retorna400()
    {
        var token = await TokenAsync();
        var response = await EnviarAsync("/api/busca/enderecos?q=ab", token);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BuscarEnderecos_TermoValido_Retorna200ComResultados()
    {
        var token = await TokenAsync();
        var response = await EnviarAsync("/api/busca/enderecos?q=avenida%20paulista", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var enderecos = await response.Content.ReadFromJsonAsync<List<EnderecoBuscaDto>>(JsonOpts);
        enderecos.Should().NotBeNullOrEmpty();
        enderecos!.Should().OnlyContain(e =>
            !string.IsNullOrWhiteSpace(e.Descricao) && e.Latitude != 0 && e.Longitude != 0);
    }

    [Fact]
    public async Task RuaPerto_PontoEmSaoPaulo_DevolveARua()
    {
        var token = await TokenAsync();
        var response = await EnviarAsync("/api/busca/rua?lat=-23.555&lon=-46.59", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var corpo = await response.Content.ReadFromJsonAsync<RuaPertoDto>(JsonOpts);
        corpo!.Rua.Should().Be("Rua Taquari");
    }

    [Fact]
    public async Task RuaPerto_ForaDeSaoPaulo_Retorna400()
    {
        var token = await TokenAsync();
        var response = await EnviarAsync("/api/busca/rua?lat=-46.59&lon=-23.555", token); // trocadas

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RuaPerto_NaN_Retorna400()
    {
        var token = await TokenAsync();
        var response = await EnviarAsync("/api/busca/rua?lat=NaN&lon=NaN", token);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RuaPerto_SemToken_Retorna401()
        => (await _client.GetAsync("/api/busca/rua?lat=-23.555&lon=-46.59")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

    // Baixada escondida até o lançamento: a conta comum busca só na capital; o Admin, nas duas.
    [Fact]
    public async Task Busca_UsuarioComum_MandaSoACaixaDaCapital()
    {
        var token = await TokenAsync();
        (await EnviarAsync("/api/busca/enderecos?q=cobertura%20comum", token)).StatusCode.Should().Be(HttpStatusCode.OK);

        FakeGeocodingClient.BboxPorConsulta["cobertura comum"].Should().Be("-46.83,-24.01,-46.36,-23.35");
    }

    [Fact]
    public async Task Busca_Admin_MandaAsDuas()
    {
        var token = (await SessaoAdmin.ObterAsync(_factory, _client)).Token;
        (await EnviarAsync("/api/busca/enderecos?q=cobertura%20admin", token)).StatusCode.Should().Be(HttpStatusCode.OK);

        FakeGeocodingClient.BboxPorConsulta["cobertura admin"].Should().Be("-47.13,-24.5,-45.79,-23.35");
    }

    [Fact]
    public async Task RuaPerto_EmSantos_AdminOk_UsuarioComum400()
    {
        const string santos = "/api/busca/rua?lat=-23.9608&lon=-46.3336";
        (await EnviarAsync(santos, await TokenAsync())).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await EnviarAsync(santos, (await SessaoAdmin.ObterAsync(_factory, _client)).Token)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Helpers ────────────────────────────────────────────────

    private async Task<string> TokenAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Teste", Email = $"busca_{Guid.NewGuid()}@test.com", Senha = "Senha@123" });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        return body!.Token;
    }

    private async Task<HttpResponseMessage> EnviarAsync(string url, string token)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };
        return await _client.SendAsync(req);
    }
}
