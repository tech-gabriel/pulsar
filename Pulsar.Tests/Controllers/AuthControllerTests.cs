using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

public class AuthControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    public AuthControllerTests(PulsarWebApplicationFactory factory)
        => _client = factory.CreateClient();

    // ──────────────────────────────────────────────
    // POST /api/auth/cadastro
    // ──────────────────────────────────────────────

    [Fact]
    public async Task Cadastro_DadosValidos_Retorna201ComToken()
    {
        var request = new CadastroRequestDto
        {
            Nome  = "Gabriel Teste",
            Email = $"gabriel_{Guid.NewGuid()}@test.com",
            Senha = "Senha@123"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/cadastro", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        body.Should().NotBeNull();
        body!.Token.Should().NotBeNullOrWhiteSpace();
        body.Usuario.Email.Should().Be(request.Email);
    }

    [Fact]
    public async Task Cadastro_EmailJaExistente_Retorna409()
    {
        var email = $"duplicado_{Guid.NewGuid()}@test.com";
        var request = new CadastroRequestDto { Nome = "Dup", Email = email, Senha = "Senha@123" };

        await _client.PostAsJsonAsync("/api/auth/cadastro", request);
        var response = await _client.PostAsJsonAsync("/api/auth/cadastro", request);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Cadastro_SenhaSemCaractereEspecial_Retorna400()
    {
        var request = new CadastroRequestDto
        {
            Nome  = "Teste",
            Email = $"fraca_{Guid.NewGuid()}@test.com",
            Senha = "SenhaSem12" // sem caractere especial
        };

        var response = await _client.PostAsJsonAsync("/api/auth/cadastro", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Cadastro_SenhaSemDoisNumeros_Retorna400()
    {
        var request = new CadastroRequestDto
        {
            Nome  = "Teste",
            Email = $"fraca2_{Guid.NewGuid()}@test.com",
            Senha = "SenhaFraca1!" // apenas 1 número
        };

        var response = await _client.PostAsJsonAsync("/api/auth/cadastro", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Cadastro_SenhaCurta_Retorna400()
    {
        var request = new CadastroRequestDto
        {
            Nome  = "Teste",
            Email = $"curta_{Guid.NewGuid()}@test.com",
            Senha = "S@1" // < 8 chars
        };

        var response = await _client.PostAsJsonAsync("/api/auth/cadastro", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Cadastro_EmailInvalido_Retorna400()
    {
        var request = new CadastroRequestDto
        {
            Nome  = "Teste",
            Email = "nao-é-um-email",
            Senha = "Senha@123"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/cadastro", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ──────────────────────────────────────────────
    // POST /api/auth/login
    // ──────────────────────────────────────────────

    [Fact]
    public async Task Login_CredenciaisValidas_Retorna200ComToken()
    {
        var email = $"login_{Guid.NewGuid()}@test.com";
        var senha = "Senha@123";
        await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Login Teste", Email = email, Senha = senha });

        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = email, Senha = senha });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        body!.Token.Should().NotBeNullOrWhiteSpace();
        body.Usuario.Email.Should().Be(email);
    }

    [Fact]
    public async Task Login_SenhaErrada_Retorna401()
    {
        var email = $"wrong_{Guid.NewGuid()}@test.com";
        await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Teste", Email = email, Senha = "Senha@123" });

        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = email, Senha = "SenhaErrada@99" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_EmailInexistente_Retorna401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = "naoexiste@test.com", Senha = "Qualquer@12" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Logout_SemAutenticacao_Retorna200()
    {
        // Logout é stateless: sempre retorna 200 independente de auth
        var response = await _client.PostAsync("/api/auth/logout", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ──────────────────────────────────────────────
    // GET /api/regioes — autenticação obrigatória
    // ──────────────────────────────────────────────

    [Fact]
    public async Task GetRegioes_SemToken_Retorna401()
    {
        var response = await _client.GetAsync("/api/regioes");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetRegioes_ComToken_Retorna200()
    {
        var token = await ObterTokenAsync();
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/regioes");

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Limpa header para não afetar outros testes
        _client.DefaultRequestHeaders.Authorization = null;
    }

    [Fact]
    public async Task GetRegioes_ComToken_RetornaListaDeRegioes()
    {
        var token = await ObterTokenAsync();
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/regioes");
        var regioes = await response.Content.ReadFromJsonAsync<List<RegiaoDto>>(JsonOpts);

        // Seed data contém 5 regiões
        regioes.Should().HaveCount(5);
        regioes!.Select(r => r.Nome).Should().Contain(["Centro", "Leste", "Norte", "Oeste", "Sul"]);

        _client.DefaultRequestHeaders.Authorization = null;
    }

    [Fact]
    public async Task GetRegiaoById_IdInvalido_Retorna404()
    {
        var token = await ObterTokenAsync();
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync($"/api/regioes/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        _client.DefaultRequestHeaders.Authorization = null;
    }

    // ──────────────────────────────────────────────
    // GET /api/subprefeituras/{id}/historico
    // ──────────────────────────────────────────────

    [Fact]
    public async Task GetHistorico_SemToken_Retorna401()
    {
        var response = await _client.GetAsync($"/api/subprefeituras/{Guid.NewGuid()}/historico");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetHistorico_SubprefeituraInexistente_Retorna404()
    {
        var token = await ObterTokenAsync();
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync($"/api/subprefeituras/{Guid.NewGuid()}/historico");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        _client.DefaultRequestHeaders.Authorization = null;
    }

    [Fact]
    public async Task GetHistorico_HorasInvalidas_Retorna400()
    {
        var token = await ObterTokenAsync();
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync($"/api/subprefeituras/{Guid.NewGuid()}/historico?horas=0");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        _client.DefaultRequestHeaders.Authorization = null;
    }

    // ──────────────────────────────────────────────
    // Helper
    // ──────────────────────────────────────────────

    private async Task<string> ObterTokenAsync()
    {
        var email = $"helper_{Guid.NewGuid()}@test.com";
        var response = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Helper", Email = email, Senha = "Helper@123" });

        var body = await response.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        return body!.Token;
    }
}
