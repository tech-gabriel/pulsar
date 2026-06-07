using System.Net;
using System.Text.Json;
using FluentAssertions;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

public class HealthCheckTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthCheckTests(PulsarWebApplicationFactory factory)
        => _client = factory.CreateClient();

    [Fact]
    public async Task Health_SemAutenticacao_Retorna200ComStatusEChecks()
    {
        // /health deve ser público e responder mesmo sem leituras coletadas
        // (estado Degraded ainda retorna 200).
        var response = await _client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("status").GetString().Should().NotBeNullOrEmpty();
        root.GetProperty("checks")
            .EnumerateArray()
            .Should().Contain(c => c.GetProperty("nome").GetString() == "coleta");
    }
}
