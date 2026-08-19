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
/// Autorização e contrato do disparo manual do motor de notificações. A rota existe
/// porque o briefing das 6h locais não dá para esperar sentado, nem local nem em
/// produção, e porque ela manda push de verdade para gente de verdade.
/// </summary>
public class AdminNotificacoesControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private const string Rota = "/api/admin/notificacoes/avaliar";

    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public AdminNotificacoesControllerTests(PulsarWebApplicationFactory factory)
        => _client = factory.CreateClient();

    [Fact]
    public async Task Avaliar_SemToken_Retorna401()
    {
        var resposta = await _client.PostAsync(Rota, null);

        resposta.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Avaliar_UsuarioComum_Retorna403()
    {
        var token = (await CadastrarAsync($"comum_{Guid.NewGuid()}@test.com", "Senha@123")).Token;

        var resposta = await EnviarComTokenAsync(Rota, token);

        resposta.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Avaliar_Suporte_Retorna403()
    {
        // SUPORTE lê o painel admin inteiro, mas disparar o motor MANDA PUSH para
        // usuários reais. Fica com ADMIN, como a coleta manual e o sync do GeoSampa.
        var email = $"suporte_notif_{Guid.NewGuid()}@test.com";
        var suporte = await CadastrarAsync(email, "Senha@123");
        var adminToken = await TokenAdminAsync();

        var promocao = await EnviarComTokenAsync($"/api/admin/usuarios/{suporte.Usuario.Id}/role",
            adminToken, HttpMethod.Put, new AlterarRoleRequestDto { Role = RoleAcesso.SUPORTE });

        // O arranjo é conferido, e não presumido: AlterarRole pode devolver 400 ou 404, e uma
        // promoção que falhe em silêncio deixa a conta em USUARIO. USUARIO também leva 403
        // nesta rota, então o teste seguiria VERDE para sempre sem nunca encostar na fronteira
        // ADMIN/SUPORTE, que é a única coisa que ele existe para defender.
        promocao.StatusCode.Should().Be(HttpStatusCode.OK,
            "sem a promoção a conta continua USUARIO e o 403 lá embaixo não prova nada");

        // Relogin para o token carregar a role nova, e conferência da role no próprio token
        // que vai ser usado: é ele, e não o registro no banco, que o [Authorize] vai ler.
        var sessaoSuporte = await LoginAsync(email, "Senha@123");
        sessaoSuporte.Usuario.Role.Should().Be(RoleAcesso.SUPORTE,
            "o 403 abaixo só vale se quem bateu na rota for mesmo SUPORTE");

        var resposta = await EnviarComTokenAsync(Rota, sessaoSuporte.Token);

        resposta.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Avaliar_Admin_Retorna200ComOCampoEnviados()
    {
        var token = await TokenAdminAsync();

        var resposta = await EnviarComTokenAsync(Rota, token);

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);

        // Lê o JSON cru de propósito: desserializar num record faria um campo com outro
        // nome cair no default 0 e o teste passaria sem que o contrato existisse.
        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        doc.RootElement.TryGetProperty("enviados", out var enviados)
            .Should().BeTrue("o contrato da rota é { enviados: int }");
        enviados.ValueKind.Should().Be(JsonValueKind.Number);

        // Sem chaves VAPID no ambiente de teste o motor devolve 0 sem avaliar nada. Zero
        // é o resultado correto aqui: o que este teste prova é que a rota existe, exige
        // ADMIN e responde no formato esperado.
        enviados.GetInt32().Should().Be(0);
    }

    // ── Helpers ────────────────────────────────────────────────

    private async Task<LoginResponseDto> CadastrarAsync(string email, string senha)
    {
        var resposta = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Teste", Email = email, Senha = senha });
        resposta.EnsureSuccessStatusCode();
        return (await resposta.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
    }

    /// <summary>Sessão completa, e não só o token: a role vem no corpo e vale conferir.</summary>
    private async Task<LoginResponseDto> LoginAsync(string email, string senha)
    {
        var resposta = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequestDto { Email = email, Senha = senha });
        resposta.EnsureSuccessStatusCode();
        return (await resposta.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
    }

    private async Task<string> TokenAdminAsync()
    {
        const string email = PulsarWebApplicationFactory.EmailAdminBootstrap;
        const string senha = "Admin@123";

        var cadastro = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Admin", Email = email, Senha = senha });

        if (cadastro.IsSuccessStatusCode)
            return (await cadastro.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!.Token;

        // Já existe (a ordem dos testes não é garantida) → login faz o auto-heal da role.
        return (await LoginAsync(email, senha)).Token;
    }

    private async Task<HttpResponseMessage> EnviarComTokenAsync(
        string url, string token, HttpMethod? metodo = null, object? corpo = null)
    {
        using var req = new HttpRequestMessage(metodo ?? HttpMethod.Post, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };
        if (corpo is not null)
            req.Content = JsonContent.Create(corpo);
        return await _client.SendAsync(req);
    }
}
