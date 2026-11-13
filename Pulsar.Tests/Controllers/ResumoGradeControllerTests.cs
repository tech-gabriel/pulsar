using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>Contrato de <c>GET /api/admin/grade/resumo</c>.</summary>
public class ResumoGradeControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly PulsarWebApplicationFactory _factory;

    public ResumoGradeControllerTests(PulsarWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task SemToken_Retorna401()
    {
        var resposta = await _factory.CreateClient().GetAsync("/api/admin/grade/resumo");
        resposta.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Admin_Retorna200ComLista()
    {
        var client = _factory.CreateClient();
        var token = (await SessaoAdmin.ObterAsync(_factory, client)).Token;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var resposta = await client.GetAsync("/api/admin/grade/resumo?dias=7");

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resposta.Content.ReadFromJsonAsync<List<ResumoGradeAreaDto>>()).Should().NotBeNull();
    }
}
