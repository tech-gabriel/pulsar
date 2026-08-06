using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

public class OcorrenciasControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public OcorrenciasControllerTests(PulsarWebApplicationFactory factory)
        => _client = factory.CreateClient();

    private async Task<string> TokenUsuarioComumAsync()
    {
        var email = $"user_{Guid.NewGuid()}@test.com";
        var resp = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new { Nome = "User", Email = email, Senha = "Senha@123" });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        return body!.Token;
    }

    private async Task<HttpResponseMessage> GetComTokenAsync(string url, string token)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _client.SendAsync(req);
    }

    [Fact]
    public async Task GetAlagamento_SemToken_Retorna401()
    {
        var resp = await _client.GetAsync("/api/ocorrencias/alagamento");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetAlagamento_ComToken_Retorna200ComLista()
    {
        var token = await TokenUsuarioComumAsync();
        var resp = await GetComTokenAsync("/api/ocorrencias/alagamento", token);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var lista = await resp.Content.ReadFromJsonAsync<List<OcorrenciaAlagamentoDto>>(JsonOpts);
        lista.Should().NotBeNull(); // vazia é válido (banco de teste sem seed de ocorrências)
    }

    [Fact]
    public async Task GetProximas_ComToken_Retorna200()
    {
        var token = await TokenUsuarioComumAsync();
        var resp = await GetComTokenAsync(
            "/api/ocorrencias/alagamento/proximas?lat=-23.55&lon=-46.63&raioMetros=500", token);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await resp.Content.ReadFromJsonAsync<OcorrenciasProximasDto>(JsonOpts);
        dto.Should().NotBeNull();
        dto!.Total.Should().Be(0);
    }

    [Theory]
    [InlineData(100, -46.63, 500)]   // lat fora de [-90,90]
    [InlineData(-23.55, 200, 500)]   // lon fora de [-180,180]
    [InlineData(-23.55, -46.63, 0)]  // raioMetros <= 0
    [InlineData(-23.55, -46.63, 25000)] // raioMetros > 20000
    public async Task GetProximas_ParametrosInvalidos_Retorna400(double lat, double lon, int raioMetros)
    {
        var token = await TokenUsuarioComumAsync();
        var resp = await GetComTokenAsync(
            $"/api/ocorrencias/alagamento/proximas?lat={lat}&lon={lon}&raioMetros={raioMetros}", token);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostSincronizar_UsuarioComum_Retorna403()
    {
        var token = await TokenUsuarioComumAsync();
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/admin/ocorrencias/sincronizar");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _client.SendAsync(req);
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
