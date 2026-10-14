using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>Revogação de sessões (SEC2): um teste por evento da tabela da spec.</summary>
public class SessoesTests : IClassFixture<PulsarWebApplicationFactory>
{
    private const string Senha = "Senha#2026xx";
    private readonly PulsarWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public SessoesTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<LoginResponseDto> Cadastrar(string email)
    {
        var r = await _client.PostAsJsonAsync("/api/auth/cadastro", new CadastroRequestDto { Nome = "Fulano", Email = email, Senha = Senha });
        r.EnsureSuccessStatusCode();
        return (await r.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
    }

    private async Task<LoginResponseDto> Entrar(string email, string senha = Senha)
    {
        var r = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto { Email = email, Senha = senha });
        r.EnsureSuccessStatusCode();
        return (await r.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
    }

    private async Task<HttpStatusCode> Me(string token)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/usuarios/me");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return (await _client.SendAsync(req)).StatusCode;
    }

    private async Task<HttpResponseMessage> Enviar(HttpMethod metodo, string url, string token, object? corpo = null)
    {
        using var req = new HttpRequestMessage(metodo, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (corpo is not null) req.Content = JsonContent.Create(corpo);
        return await _client.SendAsync(req);
    }

    private static string NovoEmail(string prefixo) => $"{prefixo}_{Guid.NewGuid():N}@test.com";

    [Fact]
    public async Task Token_LevaOCarimboDaConta()
    {
        var sessao = await Cadastrar(NovoEmail("carimbo"));

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(sessao.Token);

        jwt.Claims.Should().Contain(c => c.Type == "carimbo" && c.Value.Length == 32);
    }

    [Fact]
    public async Task TokenSemCarimbo_Recebe401()
    {
        var sessao = await Cadastrar(NovoEmail("semcarimbo"));
        var handler = new JwtSecurityTokenHandler();
        var original = handler.ReadJwtToken(sessao.Token);
        var chave = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
            System.Text.Encoding.UTF8.GetBytes(PulsarWebApplicationFactory.JwtSecretTeste));
        var semCarimbo = new JwtSecurityToken(
            issuer: "Pulsar.Tests", audience: "Pulsar.Tests",
            claims: original.Claims.Where(c => c.Type is not ("carimbo" or "aud" or "iss" or "exp" or "nbf" or "iat")),
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: new Microsoft.IdentityModel.Tokens.SigningCredentials(
                chave, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256));

        (await Me(handler.WriteToken(semCarimbo))).Should().Be(HttpStatusCode.Unauthorized);
        (await Me(sessao.Token)).Should().Be(HttpStatusCode.OK);
    }
}
