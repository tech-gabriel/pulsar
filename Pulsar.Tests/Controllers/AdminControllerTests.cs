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
/// Testes de autorização e regras da área administrativa (roles ADMIN/SUPORTE),
/// bootstrap por configuração e bloqueio de conta inativa.
/// </summary>
public class AdminControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public AdminControllerTests(PulsarWebApplicationFactory factory)
        => _client = factory.CreateClient();

    // ── Bootstrap ──────────────────────────────────────────────

    [Fact]
    public async Task EmailNaListaAdmin_RecebeRoleAdmin()
    {
        // Independente da ordem dos testes: cadastro promove na 1ª vez; se o admin
        // já existir, o login faz o auto-heal. Em ambos os casos a role é ADMIN.
        var body = await CadastrarOuLoginAdminAsync();
        body.Usuario.Role.Should().Be(RoleAcesso.ADMIN);
    }

    [Fact]
    public async Task Cadastro_EmailComum_RecebeRoleUsuario()
    {
        var body = await CadastrarAsync($"comum_{Guid.NewGuid()}@test.com", "Senha@123");
        body.Usuario.Role.Should().Be(RoleAcesso.USUARIO);
    }

    // ── GET /api/admin/usuarios ────────────────────────────────

    [Fact]
    public async Task GetUsuarios_SemToken_Retorna401()
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/admin/usuarios");
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUsuarios_UsuarioComum_Retorna403()
    {
        var token = (await CadastrarAsync($"comum_{Guid.NewGuid()}@test.com", "Senha@123")).Token;
        var response = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/usuarios", token);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetUsuarios_Admin_Retorna200ComLista()
    {
        var token = await TokenAdminAsync();
        var response = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/usuarios", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var usuarios = await response.Content.ReadFromJsonAsync<List<UsuarioAdminDto>>(JsonOpts);
        usuarios.Should().NotBeNull();
        usuarios!.Should().Contain(u => u.Email == PulsarWebApplicationFactory.EmailAdminBootstrap);
    }

    // ── PUT role/ativo ─────────────────────────────────────────

    [Fact]
    public async Task AlterarRole_Admin_PromoveUsuarioParaSuporte()
    {
        var alvo = await CadastrarAsync($"alvo_{Guid.NewGuid()}@test.com", "Senha@123");
        var adminToken = await TokenAdminAsync();

        var response = await EnviarComTokenAsync(
            HttpMethod.Put, $"/api/admin/usuarios/{alvo.Usuario.Id}/role", adminToken,
            new AlterarRoleRequestDto { Role = RoleAcesso.SUPORTE });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var atualizado = await response.Content.ReadFromJsonAsync<UsuarioAdminDto>(JsonOpts);
        atualizado!.Role.Should().Be(RoleAcesso.SUPORTE);
    }

    [Fact]
    public async Task AlterarRole_UsuarioComum_Retorna403()
    {
        var alvo = await CadastrarAsync($"alvo_{Guid.NewGuid()}@test.com", "Senha@123");
        var comumToken = (await CadastrarAsync($"comum_{Guid.NewGuid()}@test.com", "Senha@123")).Token;

        var response = await EnviarComTokenAsync(
            HttpMethod.Put, $"/api/admin/usuarios/{alvo.Usuario.Id}/role", comumToken,
            new AlterarRoleRequestDto { Role = RoleAcesso.ADMIN });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AlterarRole_AdminNaPropriaConta_Retorna400()
    {
        var admin = await CadastrarOuLoginAdminAsync();

        var response = await EnviarComTokenAsync(
            HttpMethod.Put, $"/api/admin/usuarios/{admin.Usuario.Id}/role", admin.Token,
            new AlterarRoleRequestDto { Role = RoleAcesso.USUARIO });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Suporte_PodeLerMasNaoEscrever()
    {
        // Cria um usuário e o promove a SUPORTE via admin.
        var email = $"suporte_{Guid.NewGuid()}@test.com";
        var suporte = await CadastrarAsync(email, "Senha@123");
        var adminToken = await TokenAdminAsync();
        await EnviarComTokenAsync(
            HttpMethod.Put, $"/api/admin/usuarios/{suporte.Usuario.Id}/role", adminToken,
            new AlterarRoleRequestDto { Role = RoleAcesso.SUPORTE });

        // Relogin para obter token com a role atualizada.
        var suporteToken = await LoginAsync(email, "Senha@123");

        var leitura = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/usuarios", suporteToken);
        leitura.StatusCode.Should().Be(HttpStatusCode.OK);

        var escrita = await EnviarComTokenAsync(
            HttpMethod.Put, $"/api/admin/usuarios/{suporte.Usuario.Id}/ativo", suporteToken,
            new AlterarAtivoRequestDto { Ativo = false });
        escrita.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Login_ContaDesativada_Retorna401()
    {
        var email = $"inativo_{Guid.NewGuid()}@test.com";
        var alvo = await CadastrarAsync(email, "Senha@123");
        var adminToken = await TokenAdminAsync();

        var desativar = await EnviarComTokenAsync(
            HttpMethod.Put, $"/api/admin/usuarios/{alvo.Usuario.Id}/ativo", adminToken,
            new AlterarAtivoRequestDto { Ativo = false });
        desativar.StatusCode.Should().Be(HttpStatusCode.OK);

        var login = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = email, Senha = "Senha@123" });
        login.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── Catálogo de Sugestões ──────────────────────────────────

    [Fact]
    public async Task GetSugestoes_SemToken_Retorna401()
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/admin/sugestoes");
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetSugestoes_UsuarioComum_Retorna403()
    {
        var token = (await CadastrarAsync($"comum_{Guid.NewGuid()}@test.com", "Senha@123")).Token;
        var response = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/sugestoes", token);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetSugestoes_Admin_Retorna200ComCatalogo()
    {
        var token = await TokenAdminAsync();
        var response = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/sugestoes", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var sugestoes = await response.Content.ReadFromJsonAsync<List<SugestaoAdminDto>>(JsonOpts);
        // O seed traz 45 sugestões (5 categorias × 3 faixas × 3).
        sugestoes.Should().NotBeNull();
        sugestoes!.Should().HaveCountGreaterThanOrEqualTo(45);
    }

    [Fact]
    public async Task CriarSugestao_Admin_Retorna201()
    {
        var token = await TokenAdminAsync();
        var response = await EnviarComTokenAsync(HttpMethod.Post, "/api/admin/sugestoes", token,
            new SalvarSugestaoRequestDto { Categoria = "geral", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Nova", Descricao = "Desc", Ativa = true });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var criada = await response.Content.ReadFromJsonAsync<SugestaoAdminDto>(JsonOpts);
        criada!.Categoria.Should().Be("GERAL");
        criada.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task CriarSugestao_UsuarioComum_Retorna403()
    {
        var token = (await CadastrarAsync($"comum_{Guid.NewGuid()}@test.com", "Senha@123")).Token;
        var response = await EnviarComTokenAsync(HttpMethod.Post, "/api/admin/sugestoes", token,
            new SalvarSugestaoRequestDto { Categoria = "GERAL", FaixaRisco = FaixaRisco.BAIXO, Titulo = "X", Descricao = "Y" });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CriarSugestao_TituloVazio_Retorna400()
    {
        var token = await TokenAdminAsync();
        var response = await EnviarComTokenAsync(HttpMethod.Post, "/api/admin/sugestoes", token,
            new SalvarSugestaoRequestDto { Categoria = "GERAL", FaixaRisco = FaixaRisco.BAIXO, Titulo = "   ", Descricao = "Y" });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AtualizarSugestao_Admin_Retorna200()
    {
        var token = await TokenAdminAsync();
        var criada = await CriarSugestaoAsync(token);

        var response = await EnviarComTokenAsync(HttpMethod.Put, $"/api/admin/sugestoes/{criada.Id}", token,
            new SalvarSugestaoRequestDto { Categoria = "VENTO", FaixaRisco = FaixaRisco.ALTO, Titulo = "Editada", Descricao = "Nova desc", Ativa = false });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var atualizada = await response.Content.ReadFromJsonAsync<SugestaoAdminDto>(JsonOpts);
        atualizada!.Titulo.Should().Be("Editada");
        atualizada.Categoria.Should().Be("VENTO");
        atualizada.Ativa.Should().BeFalse();
    }

    [Fact]
    public async Task AtualizarSugestao_Inexistente_Retorna404()
    {
        var token = await TokenAdminAsync();
        var response = await EnviarComTokenAsync(HttpMethod.Put, $"/api/admin/sugestoes/{Guid.NewGuid()}", token,
            new SalvarSugestaoRequestDto { Categoria = "GERAL", FaixaRisco = FaixaRisco.BAIXO, Titulo = "X", Descricao = "Y" });
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RemoverSugestao_Admin_Retorna204()
    {
        var token = await TokenAdminAsync();
        var criada = await CriarSugestaoAsync(token);

        var response = await EnviarComTokenAsync(HttpMethod.Delete, $"/api/admin/sugestoes/{criada.Id}", token);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Suporte_LeSugestoesMasNaoCria()
    {
        var email = $"suporte_sug_{Guid.NewGuid()}@test.com";
        var suporte = await CadastrarAsync(email, "Senha@123");
        var adminToken = await TokenAdminAsync();
        await EnviarComTokenAsync(HttpMethod.Put, $"/api/admin/usuarios/{suporte.Usuario.Id}/role", adminToken,
            new AlterarRoleRequestDto { Role = RoleAcesso.SUPORTE });
        var suporteToken = await LoginAsync(email, "Senha@123");

        var leitura = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/sugestoes", suporteToken);
        leitura.StatusCode.Should().Be(HttpStatusCode.OK);

        var escrita = await EnviarComTokenAsync(HttpMethod.Post, "/api/admin/sugestoes", suporteToken,
            new SalvarSugestaoRequestDto { Categoria = "GERAL", FaixaRisco = FaixaRisco.BAIXO, Titulo = "X", Descricao = "Y" });
        escrita.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Painel de sistema + métricas ───────────────────────────

    [Fact]
    public async Task GetStatus_SemToken_Retorna401()
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/admin/sistema/status");
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetStatus_Admin_Retorna200ComSubprefeituras()
    {
        var token = await TokenAdminAsync();
        var response = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/sistema/status", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var status = await response.Content.ReadFromJsonAsync<SistemaStatusDto>(JsonOpts);
        // O seed traz 32 subprefeituras ativas.
        status!.SubprefeiturasAtivas.Should().Be(32);
        status.Subprefeituras.Should().HaveCount(32);
    }

    [Fact]
    public async Task GetMetricas_UsuarioComum_Retorna403()
    {
        var token = (await CadastrarAsync($"comum_{Guid.NewGuid()}@test.com", "Senha@123")).Token;
        var response = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/metricas", token);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetMetricas_Admin_Retorna200()
    {
        var token = await TokenAdminAsync();
        var response = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/metricas", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var metricas = await response.Content.ReadFromJsonAsync<MetricasDto>(JsonOpts);
        metricas!.TotalUsuarios.Should().BeGreaterThan(0);
        metricas.TotalSugestoes.Should().BeGreaterThanOrEqualTo(45);
    }

    [Fact]
    public async Task ForcarColeta_SemToken_Retorna401()
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/admin/sistema/coletar");
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ForcarColeta_Suporte_Retorna403()
    {
        var email = $"suporte_sis_{Guid.NewGuid()}@test.com";
        var suporte = await CadastrarAsync(email, "Senha@123");
        var adminToken = await TokenAdminAsync();
        await EnviarComTokenAsync(HttpMethod.Put, $"/api/admin/usuarios/{suporte.Usuario.Id}/role", adminToken,
            new AlterarRoleRequestDto { Role = RoleAcesso.SUPORTE });
        var suporteToken = await LoginAsync(email, "Senha@123");

        var response = await EnviarComTokenAsync(HttpMethod.Post, "/api/admin/sistema/coletar", suporteToken);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ForcarColeta_Admin_Retorna200ECriaLeituras()
    {
        var token = await TokenAdminAsync();

        var response = await EnviarComTokenAsync(HttpMethod.Post, "/api/admin/sistema/coletar", token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var resultado = await response.Content.ReadFromJsonAsync<ColetaResultadoDto>(JsonOpts);
        resultado!.SubprefeiturasProcessadas.Should().Be(32);

        // Após a coleta (fake weather client), todas as subprefeituras têm leitura.
        var status = await EnviarComTokenAsync(HttpMethod.Get, "/api/admin/sistema/status", token);
        var statusDto = await status.Content.ReadFromJsonAsync<SistemaStatusDto>(JsonOpts);
        statusDto!.SubprefeiturasComLeitura.Should().Be(32);
        statusDto.LeiturasUltimas24h.Should().BeGreaterThan(0);
    }

    private async Task<SugestaoAdminDto> CriarSugestaoAsync(string adminToken)
    {
        var response = await EnviarComTokenAsync(HttpMethod.Post, "/api/admin/sugestoes", adminToken,
            new SalvarSugestaoRequestDto { Categoria = "GERAL", FaixaRisco = FaixaRisco.BAIXO, Titulo = "Base", Descricao = "Base desc", Ativa = true });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SugestaoAdminDto>(JsonOpts))!;
    }

    // ── Helpers ────────────────────────────────────────────────

    private async Task<LoginResponseDto> CadastrarAsync(string email, string senha)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Teste", Email = email, Senha = senha });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
    }

    private async Task<string> LoginAsync(string email, string senha)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = email, Senha = senha });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        return body!.Token;
    }

    /// <summary>Garante o usuário admin (cadastro idempotente) e retorna sessão completa.</summary>
    private async Task<LoginResponseDto> CadastrarOuLoginAdminAsync()
    {
        const string email = PulsarWebApplicationFactory.EmailAdminBootstrap;
        const string senha = "Admin@123";
        var cadastro = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Admin", Email = email, Senha = senha });
        if (cadastro.IsSuccessStatusCode)
            return (await cadastro.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;

        // Já existe → faz login.
        var login = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = email, Senha = senha });
        login.EnsureSuccessStatusCode();
        return (await login.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
    }

    private async Task<string> TokenAdminAsync() => (await CadastrarOuLoginAdminAsync()).Token;

    private async Task<HttpResponseMessage> EnviarComTokenAsync(
        HttpMethod metodo, string url, string token, object? corpo = null)
    {
        using var req = new HttpRequestMessage(metodo, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };
        if (corpo is not null)
            req.Content = JsonContent.Create(corpo);
        return await _client.SendAsync(req);
    }
}
