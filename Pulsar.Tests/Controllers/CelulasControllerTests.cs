using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>Contrato de <c>GET /api/celulas</c>.</summary>
public class CelulasControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };
    private readonly PulsarWebApplicationFactory _factory;

    public CelulasControllerTests(PulsarWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task SemToken_Retorna401()
    {
        var resposta = await _factory.CreateClient().GetAsync("/api/celulas");
        resposta.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ComToken_Retorna200ComCelulasEEstacoes()
    {
        var client = _factory.CreateClient();
        var token = (await SessaoAdmin.ObterAsync(_factory, client)).Token;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/api/celulas");

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        var corpo = await resposta.Content.ReadFromJsonAsync<CelulasAgoraDto>(Json);
        corpo!.Celulas.Should().NotBeNull();
        corpo.Estacoes.Should().NotBeNull();
    }
}
