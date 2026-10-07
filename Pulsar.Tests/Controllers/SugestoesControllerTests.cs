using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>Contrato de <c>GET /api/sugestoes</c>: o catálogo de dicas por perigo que o app exibe.</summary>
public class SugestoesControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly PulsarWebApplicationFactory _factory;
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public SugestoesControllerTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Lista_SemToken_Retorna401()
        => (await _client.GetAsync("/api/sugestoes")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

    [Fact]
    public async Task Lista_TrazOCatalogoPorPerigoEmOrdem()
    {
        var dicas = await ListarAsync();

        dicas.Should().HaveCount(18);
        dicas.Select(d => d.Categoria).Distinct().Should().BeEquivalentTo(["ALAGAMENTO", "VENTO", "CALOR"]);
        dicas.Should().BeInAscendingOrder(d => d.Categoria);
        dicas.Where(d => d.Categoria == "CALOR" && d.Faixa == FaixaRisco.ALTO)
            .Select(d => d.Ordem).Should().Equal(1, 2, 3);
    }

    [Fact]
    public async Task Lista_IgnoraInativas()
    {
        Guid id;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            var uma = await db.Sugestoes.FirstAsync(s => s.Categoria == "VENTO");
            id = uma.Id;
            uma.Ativa = false;
            await db.SaveChangesAsync();
        }
        try
        {
            (await ListarAsync()).Should().HaveCount(17).And.NotContain(d => d.Id == id);
        }
        finally
        {
            // A fixture é da classe: sem reativar, o teste do catálogo completo veria 17.
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            (await db.Sugestoes.FindAsync(id))!.Ativa = true;
            await db.SaveChangesAsync();
        }
    }

    private async Task<List<SugestaoPublicaDto>> ListarAsync()
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/sugestoes")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", await TokenAsync()) }
        };
        var resposta = await _client.SendAsync(req);
        resposta.EnsureSuccessStatusCode();
        return (await resposta.Content.ReadFromJsonAsync<List<SugestaoPublicaDto>>(JsonOpts))!;
    }

    private async Task<string> TokenAsync()
    {
        var resposta = await _client.PostAsJsonAsync("/api/auth/cadastro", new CadastroRequestDto
        {
            Nome = "Teste",
            Email = $"dicas_{Guid.NewGuid()}@test.com",
            Senha = "Senha@123",
        });
        resposta.EnsureSuccessStatusCode();
        return (await resposta.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!.Token;
    }
}
