using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using FluentAssertions;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>Fluxo de confirmação de e-mail ponta a ponta (SEC1), com o link lido do remetente falso.</summary>
public class VerificacaoEmailTests : IClassFixture<PulsarWebApplicationFactory>
{
    private const string Senha = "Senha#2026xx";
    private readonly PulsarWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public VerificacaoEmailTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<LoginResponseDto> Cadastrar(string email)
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/cadastro", new CadastroRequestDto { Nome = "Fulano", Email = email, Senha = Senha });
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
    }

    private Task<HttpResponseMessage> Confirmar(string token)
        => _client.PostAsJsonAsync("/api/auth/confirmar-email", new ConfirmarEmailRequestDto { Token = token });

    private async Task<HttpResponseMessage> Enviar(HttpMethod metodo, string url, string token, object? corpo = null)
    {
        using var req = new HttpRequestMessage(metodo, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (corpo is not null) req.Content = JsonContent.Create(corpo);
        return await _client.SendAsync(req);
    }

    private async Task<UsuarioDto> Me(string token)
        => (await (await Enviar(HttpMethod.Get, "/api/usuarios/me", token)).Content.ReadFromJsonAsync<UsuarioDto>(JsonOpts))!;

    [Fact]
    public async Task Cadastro_NasceNaoVerificado_EConfirmarPeloLinkVerifica()
    {
        var email = $"novo_{Guid.NewGuid():N}@test.com";
        var sessao = await Cadastrar(email);
        sessao.Token.Should().NotBeNullOrWhiteSpace(); // entra direto, como antes
        sessao.Usuario.EmailVerificado.Should().BeFalse();

        (await Confirmar(_factory.Emails.UltimoTokenPara(email))).StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await Me(sessao.Token)).EmailVerificado.Should().BeTrue();
    }

    [Fact]
    public async Task Confirmar_MesmoLinkDuasVezes_SegundaDa400()
    {
        var email = $"duas_{Guid.NewGuid():N}@test.com";
        await Cadastrar(email);
        var token = _factory.Emails.UltimoTokenPara(email);

        await Confirmar(token);
        var segunda = await Confirmar(token);

        segunda.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Cadastro_ComEmailDaListaAdmin_SoViraAdminDepoisDeConfirmar()
    {
        var cadastro = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Admin", Email = PulsarWebApplicationFactory.EmailAdminBootstrap, Senha = SessaoAdmin.Senha });
        var antes = (await cadastro.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
        antes.Usuario.Role.Should().Be(RoleAcesso.USUARIO);

        (await Confirmar(_factory.Emails.UltimoTokenPara(PulsarWebApplicationFactory.EmailAdminBootstrap))).EnsureSuccessStatusCode();
        var login = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = PulsarWebApplicationFactory.EmailAdminBootstrap, Senha = SessaoAdmin.Senha });
        var sessao = (await login.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;

        sessao.Usuario.Role.Should().Be(RoleAcesso.ADMIN);
        sessao.Usuario.EmailVerificado.Should().BeTrue();
    }

    [Fact]
    public async Task Perfil_EmailNovo_FicaPendenteAteConfirmar()
    {
        var atual = $"atual_{Guid.NewGuid():N}@test.com";
        var novo = $"novo_{Guid.NewGuid():N}@test.com";
        var sessao = await Cadastrar(atual);

        var resp = await Enviar(HttpMethod.Put, $"/api/usuarios/{sessao.Usuario.Id}", sessao.Token,
            new AtualizarPerfilRequestDto { Nome = "Fulano", Email = novo });
        resp.EnsureSuccessStatusCode();
        var depois = (await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!.Usuario;
        depois.Email.Should().Be(atual);
        depois.EmailPendente.Should().Be(novo);

        (await Confirmar(_factory.Emails.UltimoTokenPara(novo))).EnsureSuccessStatusCode();

        var me = await Me(sessao.Token);
        me.Email.Should().Be(novo);
        me.EmailPendente.Should().BeNull();
    }

    [Fact]
    public async Task Perfil_VoltarAoEmailAtualAntesDeConfirmar_LimpaPendenteEInvalidaOLink()
    {
        var atual = $"volta_{Guid.NewGuid():N}@test.com";
        var novo = $"vnovo_{Guid.NewGuid():N}@test.com";
        var sessao = await Cadastrar(atual);
        await Enviar(HttpMethod.Put, $"/api/usuarios/{sessao.Usuario.Id}", sessao.Token, new AtualizarPerfilRequestDto { Nome = "Fulano", Email = novo });
        var linkDoNovo = _factory.Emails.UltimoTokenPara(novo);

        await Enviar(HttpMethod.Put, $"/api/usuarios/{sessao.Usuario.Id}", sessao.Token, new AtualizarPerfilRequestDto { Nome = "Fulano", Email = atual });

        (await Me(sessao.Token)).EmailPendente.Should().BeNull();
        (await Confirmar(linkDoNovo)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Me(sessao.Token)).Email.Should().Be(atual);
    }

    [Fact]
    public async Task Reenviar_MandaNovoLink()
    {
        var email = $"reenvio_{Guid.NewGuid():N}@test.com";
        var sessao = await Cadastrar(email);
        var antes = _factory.Emails.Enviados.Count(e => e.Para == email);

        (await Enviar(HttpMethod.Post, "/api/usuarios/me/reenviar-confirmacao", sessao.Token))
            .StatusCode.Should().Be(HttpStatusCode.NoContent);

        _factory.Emails.Enviados.Count(e => e.Para == email).Should().Be(antes + 1);
    }

    [Fact]
    public async Task Me_SemToken_Retorna401()
        => (await _client.GetAsync("/api/usuarios/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

    [Fact]
    public async Task Reset_DeContaNaoVerificada_VerificaAConta()
    {
        var email = $"reset_{Guid.NewGuid():N}@test.com";
        var sessao = await Cadastrar(email);
        await _client.PostAsJsonAsync("/api/auth/esqueci-senha", new EsqueciSenhaRequestDto { Email = email });
        var html = _factory.Emails.Enviados.Last(e => e.Para == email && e.Html.Contains("redefinir-senha")).Html;
        var token = Uri.UnescapeDataString(Regex.Match(html, "token=([^\"&]+)").Groups[1].Value);

        (await _client.PostAsJsonAsync("/api/auth/redefinir-senha", new RedefinirSenhaRequestDto { Token = token, NovaSenha = "Outra#2026xx" }))
            .EnsureSuccessStatusCode();

        // Desde o SEC2 o reset derruba as sessões abertas: confere entrando com a senha nova.
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequestDto { Email = email, Senha = "Outra#2026xx" });
        var novaSessao = (await login.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
        (await Me(novaSessao.Token)).EmailVerificado.Should().BeTrue();
    }
}
