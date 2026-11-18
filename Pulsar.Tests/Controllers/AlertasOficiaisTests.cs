using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>Alertas oficiais da Defesa Civil na lista de áreas (é dela que o detalhe do app lê).</summary>
public class AlertasOficiaisTests : IClassFixture<PulsarWebApplicationFactory>
{
    private static readonly Guid Se = new("20000000-0000-0000-0000-000000000001");
    private static readonly Guid Santos = new("20000000-0000-0000-0000-000000000033");
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };
    private readonly PulsarWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AlertasOficiaisTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        Semear();
    }

    private void Semear()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
        if (db.AlertasOficiais.Any(a => a.Identificador.StartsWith("teste-"))) return;
        var agora = DateTime.UtcNow;
        AlertaOficial Alerta(string id, Guid area, DateTime expira) => new()
        {
            Identificador = id, Evento = "CHUVAS INTENSAS", Gravidade = "Severe", Urgencia = "Expected",
            InicioUtc = agora.AddMinutes(-20), ExpiraUtc = expira, Emissor = "Defesa Civil Estadual De São Paulo",
            Titulo = "Defesa Civil:14h05 Chuva forte", Descricao = "Risco de alagamentos.", RecebidoEmUtc = agora,
            Areas = [new AlertaOficialArea { SubprefeituraId = area }],
        };
        db.AlertasOficiais.AddRange(
            Alerta("teste-se", Se, agora.AddHours(2)),
            Alerta("teste-se-vencido", Se, agora.AddMinutes(-1)),
            Alerta("teste-santos", Santos, agora.AddHours(2)));
        db.SaveChanges();
    }

    private async Task<List<SubprefeituraResumoDto>> ListaAsync(string token)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/subprefeituras");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return (await (await _client.SendAsync(req)).Content.ReadFromJsonAsync<List<SubprefeituraResumoDto>>(Json))!;
    }

    private async Task<string> TokenComumAsync()
    {
        var r = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Comum", Email = $"alerta_{Guid.NewGuid()}@test.com", Senha = "Senha@123" });
        r.EnsureSuccessStatusCode();
        return (await r.Content.ReadFromJsonAsync<LoginResponseDto>(Json))!.Token;
    }

    [Fact]
    public async Task Lista_TrazOAlertaAtivoDaSe_SemOVencido()
    {
        var se = (await ListaAsync(await TokenComumAsync())).Single(s => s.Id == Se);

        var alerta = se.AlertasOficiais.Should().ContainSingle().Subject;
        alerta.Gravidade.Should().Be("Severe");
        alerta.Emissor.Should().Be("Defesa Civil Estadual De São Paulo");
        alerta.Titulo.Should().Be("Defesa Civil:14h05 Chuva forte");
        alerta.ExpiraUtc.Kind.Should().Be(DateTimeKind.Utc);
    }

    // Baixada escondida: o alerta de Santos não chega à conta comum; o Admin vê.
    [Fact]
    public async Task AlertaDeSantos_SoOAdminVe()
    {
        var comum = await ListaAsync(await TokenComumAsync());
        var admin = await ListaAsync((await SessaoAdmin.ObterAsync(_factory, _client)).Token);

        comum.SelectMany(s => s.AlertasOficiais).Should().NotContain(a => a.Titulo.Contains("Santos") || a.Identificador == "teste-santos");
        admin.Single(s => s.Id == Santos).AlertasOficiais.Should().ContainSingle(a => a.Identificador == "teste-santos");
    }

    // Sem alerta, a lista vem vazia, nunca nula: o app não precisa testar null.
    [Fact]
    public async Task AreaSemAlerta_ListaVazia()
        => (await ListaAsync(await TokenComumAsync())).Single(s => s.Nome == "Mooca").AlertasOficiais.Should().BeEmpty();
}
