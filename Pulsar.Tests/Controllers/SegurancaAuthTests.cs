using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>
/// Ataques de escalada para ADMIN via e-mail (auditoria de 2026-10-09). Classe própria:
/// o e-mail de bootstrap precisa começar sem dono nesta factory.
/// </summary>
public class SegurancaAuthTests : IClassFixture<PulsarWebApplicationFactory>
{
    private const string Senha = "Senha#2026xx";
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public SegurancaAuthTests(PulsarWebApplicationFactory factory) => _client = factory.CreateClient();

    private Task<HttpResponseMessage> Cadastrar(string email)
        => _client.PostAsJsonAsync("/api/auth/cadastro", new CadastroRequestDto { Nome = "Fulano", Email = email, Senha = Senha });

    private async Task<LoginResponseDto> Ler(HttpResponseMessage resp)
        => (await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;

    [Fact]
    public async Task Cadastro_ComVariacaoDeMaiusculasDeEmailExistente_EhRecusado()
    {
        var email = $"alvo_{Guid.NewGuid():N}@test.com";
        (await Cadastrar(email)).EnsureSuccessStatusCode();

        var ataque = await Cadastrar(email.ToUpperInvariant());

        ataque.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Cadastro_DoEmailAdminEmMaiusculas_DepoisDoAdmin_NaoViraAdmin()
    {
        (await Cadastrar(PulsarWebApplicationFactory.EmailAdminBootstrap)).EnsureSuccessStatusCode();

        var ataque = await Cadastrar(PulsarWebApplicationFactory.EmailAdminBootstrap.ToUpperInvariant());

        ataque.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Cadastro_NormalizaOEmail_ELoginAceitaQualquerCaixa()
    {
        var email = $"Caixa_{Guid.NewGuid():N}@Test.com";

        var cadastro = await Ler(await Cadastrar($"  {email} "));
        cadastro.Usuario.Email.Should().Be(email.ToLowerInvariant());

        var login = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = email.ToUpperInvariant(), Senha = Senha });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Perfil_TrocarParaVariacaoDeEmailDeOutraConta_EhRecusado()
    {
        var vitima = $"vitima_{Guid.NewGuid():N}@test.com";
        (await Cadastrar(vitima)).EnsureSuccessStatusCode();
        var atacante = await Ler(await Cadastrar($"atk_{Guid.NewGuid():N}@test.com"));

        var resp = await AtualizarPerfil(atacante, vitima.ToUpperInvariant());

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Perfil_TrocarParaEmailDeAdminSemDono_ELogar_NaoPromove()
    {
        // Usa um e-mail de admin que só esta factory conhece e que ninguém cadastrou.
        var atacante = await Ler(await Cadastrar($"atk2_{Guid.NewGuid():N}@test.com"));
        var alvo = PulsarWebApplicationFactory.EmailAdminSemDono;

        (await AtualizarPerfil(atacante, alvo)).EnsureSuccessStatusCode();
        var login = await Ler(await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = alvo, Senha = Senha }));

        login.Usuario.Role.Should().Be(RoleAcesso.USUARIO);
    }

    [Theory]
    [InlineData("admin.bootſtrap@pulsar.test")]   // ſ (s longo): maiúscula dele é "S"
    [InlineData("admin.bootstrap@pulsar.teſt")]
    public async Task Cadastro_ComUnicodeQueSoCasaSemCaixa_NaoViraAdmin(string email)
    {
        var resp = await Cadastrar(email);

        if (resp.IsSuccessStatusCode)
            (await Ler(resp)).Usuario.Role.Should().Be(RoleAcesso.USUARIO);
    }

    private Task<HttpResponseMessage> AtualizarPerfil(LoginResponseDto sessao, string novoEmail)
    {
        var req = new HttpRequestMessage(HttpMethod.Put, $"/api/usuarios/{sessao.Usuario.Id}")
        {
            Content = JsonContent.Create(new AtualizarPerfilRequestDto { Nome = "Fulano", Email = novoEmail }),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", sessao.Token);
        return _client.SendAsync(req);
    }
}
