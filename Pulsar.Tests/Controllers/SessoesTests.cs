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
    public async Task SairComum_NaoDerrubaOutroAparelho()
    {
        var email = NovoEmail("sair");
        await Cadastrar(email);
        var a = await Entrar(email); var b = await Entrar(email);

        await Enviar(HttpMethod.Post, "/api/auth/logout", a.Token);

        (await Me(b.Token)).Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SairDeTodos_DerrubaTodosInclusiveOAtual()
    {
        var email = NovoEmail("todos");
        await Cadastrar(email);
        var a = await Entrar(email); var b = await Entrar(email);

        (await Enviar(HttpMethod.Post, "/api/usuarios/me/sair-de-todos", a.Token)).StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await Me(a.Token)).Should().Be(HttpStatusCode.Unauthorized);
        (await Me(b.Token)).Should().Be(HttpStatusCode.Unauthorized);
        (await Me((await Entrar(email)).Token)).Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task TrocaDeSenha_DerrubaOutros_EMantemEste()
    {
        var email = NovoEmail("troca");
        await Cadastrar(email);
        var a = await Entrar(email); var b = await Entrar(email);

        var resp = await Enviar(HttpMethod.Put, $"/api/usuarios/{a.Usuario.Id}", a.Token,
            new AtualizarPerfilRequestDto { Nome = "Fulano", Email = email, SenhaAtual = Senha, NovaSenha = "Nova#2026xx" });
        resp.EnsureSuccessStatusCode();
        var novo = (await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;

        (await Me(novo.Token)).Should().Be(HttpStatusCode.OK);
        (await Me(b.Token)).Should().Be(HttpStatusCode.Unauthorized);
        (await Me(a.Token)).Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SenhaAtualErradaNoPerfil_Responde400_ENaoParecesSessaoEncerrada()
    {
        // Com token, o front trata 401 como sessão encerrada e desloga: senha atual errada é validação (400).
        var email = NovoEmail("errada");
        var a = await Cadastrar(email);

        var resp = await Enviar(HttpMethod.Put, $"/api/usuarios/{a.Usuario.Id}", a.Token,
            new AtualizarPerfilRequestDto { Nome = "Fulano", Email = email, SenhaAtual = "Errada#2026xx", NovaSenha = "Nova#2026xx" });

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Me(a.Token)).Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task TrocaSoDeNome_NaoDerrubaNada()
    {
        var email = NovoEmail("nome");
        await Cadastrar(email);
        var a = await Entrar(email); var b = await Entrar(email);

        (await Enviar(HttpMethod.Put, $"/api/usuarios/{a.Usuario.Id}", a.Token,
            new AtualizarPerfilRequestDto { Nome = "Outro Nome", Email = email })).EnsureSuccessStatusCode();

        (await Me(b.Token)).Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ResetDeSenha_DerrubaTodas()
    {
        var email = NovoEmail("reset");
        await Cadastrar(email);
        var a = await Entrar(email);
        await _client.PostAsJsonAsync("/api/auth/esqueci-senha", new EsqueciSenhaRequestDto { Email = email });
        var html = _factory.Emails.Enviados.Last(e => e.Para == email && e.Html.Contains("redefinir-senha")).Html;
        var token = Uri.UnescapeDataString(System.Text.RegularExpressions.Regex.Match(html, "token=([^\"&]+)").Groups[1].Value);

        (await _client.PostAsJsonAsync("/api/auth/redefinir-senha", new RedefinirSenhaRequestDto { Token = token, NovaSenha = "Nova#2026xx" }))
            .EnsureSuccessStatusCode();

        (await Me(a.Token)).Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("desativar")]
    [InlineData("papel")]
    [InlineData("excluir")]
    public async Task AcaoDoAdmin_DerrubaASessaoDoAlvo(string acao)
    {
        var admin = await SessaoAdmin.ObterAsync(_factory, _client);
        var alvo = await Cadastrar(NovoEmail("alvo"));

        var resp = acao switch
        {
            "desativar" => await Enviar(HttpMethod.Put, $"/api/admin/usuarios/{alvo.Usuario.Id}/ativo", admin.Token, new AlterarAtivoRequestDto { Ativo = false }),
            "papel" => await Enviar(HttpMethod.Put, $"/api/admin/usuarios/{alvo.Usuario.Id}/role", admin.Token, new AlterarRoleRequestDto { Role = Pulsar.API.Domain.Enums.RoleAcesso.SUPORTE }),
            _ => await Enviar(HttpMethod.Delete, $"/api/admin/usuarios/{alvo.Usuario.Id}", admin.Token),
        };
        resp.IsSuccessStatusCode.Should().BeTrue();

        (await Me(alvo.Token)).Should().Be(HttpStatusCode.Unauthorized);
    }

    /// <summary>Invasor com sessão aberta deixa um e-mail dele pendente; o link chega na caixa dele.</summary>
    private async Task<(string emailVitima, string emailInvasor, string linkInvasor, LoginResponseDto sessaoInvasor)> InvasorPendurouEmail()
    {
        var vitima = NovoEmail("vitima");
        var invasor = NovoEmail("invasor");
        await Cadastrar(vitima);
        var sessaoInvasor = await Entrar(vitima);
        (await Enviar(HttpMethod.Put, $"/api/usuarios/{sessaoInvasor.Usuario.Id}", sessaoInvasor.Token,
            new AtualizarPerfilRequestDto { Nome = "Fulano", Email = invasor })).EnsureSuccessStatusCode();
        return (vitima, invasor, _factory.Emails.UltimoTokenPara(invasor), sessaoInvasor);
    }

    private Task<HttpResponseMessage> Confirmar(string token)
        => _client.PostAsJsonAsync("/api/auth/confirmar-email", new ConfirmarEmailRequestDto { Token = token });

    [Fact]
    public async Task ResetDeSenha_CancelaEmailPendenteDoInvasor()
    {
        var (vitima, _, linkInvasor, _) = await InvasorPendurouEmail();
        await _client.PostAsJsonAsync("/api/auth/esqueci-senha", new EsqueciSenhaRequestDto { Email = vitima });
        var html = _factory.Emails.Enviados.Last(e => e.Para == vitima && e.Html.Contains("redefinir-senha")).Html;
        var token = Uri.UnescapeDataString(System.Text.RegularExpressions.Regex.Match(html, "token=([^\"&]+)").Groups[1].Value);
        (await _client.PostAsJsonAsync("/api/auth/redefinir-senha", new RedefinirSenhaRequestDto { Token = token, NovaSenha = "Nova#2026xx" }))
            .EnsureSuccessStatusCode();

        (await Confirmar(linkInvasor)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Entrar(vitima, "Nova#2026xx")).Usuario.Email.Should().Be(vitima);
    }

    [Fact]
    public async Task SairDeTodos_CancelaEmailPendenteDoInvasor()
    {
        var (vitima, _, linkInvasor, _) = await InvasorPendurouEmail();
        var donaDaConta = await Entrar(vitima);

        (await Enviar(HttpMethod.Post, "/api/usuarios/me/sair-de-todos", donaDaConta.Token)).EnsureSuccessStatusCode();

        (await Confirmar(linkInvasor)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Entrar(vitima)).Usuario.EmailPendente.Should().BeNull();
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
