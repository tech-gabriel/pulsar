using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>
/// A Baixada Santista é coletada e calculada, mas só o Admin a vê enquanto não for liberada
/// (cidade com Publica = false). Toda lista que chega ao usuário comum fica só com a capital.
/// </summary>
public class BaixadaEscondidaTests : IClassFixture<PulsarWebApplicationFactory>
{
    private static readonly Guid Santos = new("20000000-0000-0000-0000-000000000033");
    private static readonly Guid Mooca = new("20000000-0000-0000-0000-000000000008");
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };
    private readonly PulsarWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public BaixadaEscondidaTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        SemearLeituras();
    }

    // Leitura e score recentes para Santos e para a Mooca: sem eles a área nem entra no cálculo dos trechos.
    private void SemearLeituras()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
        var agora = DateTime.UtcNow;
        foreach (var id in new[] { Santos, Mooca })
        {
            var leitura = new LeituraClimatica
            {
                SubprefeituraId = id, Timestamp = agora.AddMinutes(-5), ChuvaMmH = 0, VentoKmH = 5,
                VisibilidadeKm = 10, IndiceUv = 1, TemperaturaC = 22, SensacaoTermica = 22, Umidade = 70,
            };
            db.LeiturasClimaticas.Add(leitura);
            db.ScoresPerigo.Add(new ScorePerigo { SubprefeituraId = id, LeituraId = leitura.Id, Timestamp = leitura.Timestamp, Valor = 5, Faixa = FaixaRisco.BAIXO });
        }
        db.SaveChanges();
    }

    private async Task<string> TokenUsuarioComumAsync()
    {
        var resposta = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Comum", Email = $"baixada_{Guid.NewGuid()}@test.com", Senha = "Senha@123" });
        resposta.EnsureSuccessStatusCode();
        return (await resposta.Content.ReadFromJsonAsync<LoginResponseDto>(Json))!.Token;
    }

    private async Task<HttpResponseMessage> GetAsync(string url, string? token)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        if (token != null) req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await _client.SendAsync(req);
    }

    [Fact]
    public async Task Mapa_UsuarioComumNaoVeSantos()
    {
        var lista = await (await GetAsync("/api/subprefeituras", await TokenUsuarioComumAsync())).Content.ReadFromJsonAsync<List<SubprefeituraResumoDto>>(Json);

        lista.Should().HaveCount(32).And.NotContain(s => s.Id == Santos);
    }

    [Fact]
    public async Task Mapa_AdminVeAsDuasCidades()
    {
        var token = (await SessaoAdmin.ObterAsync(_factory, _client)).Token;
        var lista = await (await GetAsync("/api/subprefeituras", token)).Content.ReadFromJsonAsync<List<SubprefeituraResumoDto>>(Json);

        lista.Should().HaveCount(41).And.Contain(s => s.Id == Santos);
    }

    [Fact]
    public async Task Celulas_UsuarioComumSoTemTrechosDaCapital()
    {
        var comum = await (await GetAsync("/api/celulas", await TokenUsuarioComumAsync())).Content.ReadFromJsonAsync<CelulasAgoraDto>(Json);
        var admin = await (await GetAsync("/api/celulas", (await SessaoAdmin.ObterAsync(_factory, _client)).Token)).Content.ReadFromJsonAsync<CelulasAgoraDto>(Json);

        comum!.Celulas.Should().Contain(c => c.AreaId == Mooca).And.NotContain(c => c.AreaId == Santos);
        admin!.Celulas.Should().Contain(c => c.AreaId == Santos);
    }

    [Fact]
    public async Task PaginaPublica_NaoListaSantos()
    {
        var resposta = await GetAsync("/api/publico/risco-agora", null);

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resposta.Content.ReadAsStringAsync()).Should().NotContain(Santos.ToString()).And.NotContain("\"Santos\"");
    }

    [Fact]
    public async Task Estatisticas_NaoListamSantos()
    {
        using var json = JsonDocument.Parse(await (await GetAsync("/api/estatisticas/regioes", null)).Content.ReadAsStringAsync());
        var subs = json.RootElement.GetProperty("subprefeituras");

        subs.EnumerateObject().Should().HaveCount(32);
        subs.TryGetProperty("santos", out _).Should().BeFalse();
    }

    // Revisão final (I1): o PUT do lugar salvo aceitava o id de Santos com coordenadas da capital
    // e ainda o punha nos favoritos, o que ligava push sobre a Baixada escondida.
    [Fact]
    public async Task LugarSalvo_NaoApontaParaAreaEscondida()
    {
        var cadastro = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Casa", Email = $"casa_baixada_{Guid.NewGuid()}@test.com", Senha = "Senha@123" });
        var sessao = (await cadastro.Content.ReadFromJsonAsync<LoginResponseDto>(Json))!;
        using var req = new HttpRequestMessage(HttpMethod.Put, $"/api/usuarios/{sessao.Usuario.Id}/locais/CASA")
        {
            Content = JsonContent.Create(new SalvarLocalRequestDto { Latitude = -23.55, Longitude = -46.63, Rotulo = "Rua X, 1", SubprefeituraId = Santos }),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", sessao.Token);

        var resposta = await _client.SendAsync(req);

        resposta.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resposta.Content.ReadAsStringAsync()).Should().Contain("Subprefeitura não encontrada.");
    }

    // Revisão final (I2): histórico e previsão por id abriam Santos para qualquer conta.
    [Theory]
    [InlineData("historico")]
    [InlineData("previsao")]
    public async Task PorId_UsuarioComumNaoLeSantos_AdminLe(string recurso)
    {
        var comum = await GetAsync($"/api/subprefeituras/{Santos}/{recurso}", await TokenUsuarioComumAsync());
        var admin = await GetAsync($"/api/subprefeituras/{Santos}/{recurso}", (await SessaoAdmin.ObterAsync(_factory, _client)).Token);

        comum.StatusCode.Should().Be(HttpStatusCode.NotFound);
        admin.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Favorito_UsuarioComumNaoAcompanhaSantos()
    {
        var cadastro = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Fav", Email = $"fav_baixada_{Guid.NewGuid()}@test.com", Senha = "Senha@123" });
        var sessao = (await cadastro.Content.ReadFromJsonAsync<LoginResponseDto>(Json))!;
        using var req = new HttpRequestMessage(HttpMethod.Post, $"/api/usuarios/{sessao.Usuario.Id}/favoritos")
        {
            Content = JsonContent.Create(new AdicionarFavoritoRequestDto { SubprefeituraId = Santos }),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", sessao.Token);

        var resposta = await _client.SendAsync(req);

        resposta.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await resposta.Content.ReadAsStringAsync()).Should().Contain("Subprefeitura não encontrada.");
    }

    // O app escreve o lugar de cada área pela cidade dela ("Zona Leste · São Paulo", "Baixada Santista").
    [Fact]
    public async Task Lista_TrazACidade()
    {
        var token = (await SessaoAdmin.ObterAsync(_factory, _client)).Token;
        var lista = await (await GetAsync("/api/subprefeituras", token)).Content.ReadFromJsonAsync<List<SubprefeituraResumoDto>>(Json);

        lista!.Single(s => s.Nome == "Sé").Cidade.Should().Be("São Paulo");
        lista!.Single(s => s.Nome == "Santos").Cidade.Should().Be("Baixada Santista");
    }

    // A rota até a Baixada avalia as pontas: o Admin (que vê a Baixada) consegue; a conta comum não.
    [Fact]
    public async Task Rota_AteSantos_AdminAvalia_UsuarioComum400()
    {
        async Task<HttpResponseMessage> Avaliar(string token)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "/api/rota/avaliar")
            {
                Content = JsonContent.Create(new { subprefeituraIds = new[] { Guid.Parse("20000000-0000-0000-0000-000000000001"), Guid.Parse("20000000-0000-0000-0000-000000000033") } }),
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return await _client.SendAsync(req);
        }

        (await Avaliar(await TokenUsuarioComumAsync())).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Avaliar((await SessaoAdmin.ObterAsync(_factory, _client)).Token)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // E4b: o Admin confere a Baixada inteira antes da abertura (casa, trabalho, aviso de rota);
    // para a conta comum ela segue fora.
    [Fact]
    public async Task CasaEmSantos_Admin_Aceita_ContaComum400()
    {
        async Task<HttpResponseMessage> Salvar(string token, Guid usuarioId)
        {
            using var req = new HttpRequestMessage(HttpMethod.Put, $"/api/usuarios/{usuarioId}/locais/casa")
            {
                Content = JsonContent.Create(new SalvarLocalRequestDto { Latitude = -23.9608, Longitude = -46.3336, Rotulo = "Avenida Ana Costa, 1", SubprefeituraId = Guid.Parse("20000000-0000-0000-0000-000000000033") }),
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return await _client.SendAsync(req);
        }

        var admin = await SessaoAdmin.ObterAsync(_factory, _client);
        (await Salvar(admin.Token, admin.Usuario.Id)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task PedirAvisoAteSantos_Admin204_ContaComum400()
    {
        async Task<HttpResponseMessage> Pedir(string token)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "/api/rota/aviso")
            {
                Content = JsonContent.Create(new { subprefeituraIds = new[] { Guid.Parse("20000000-0000-0000-0000-000000000001"), Guid.Parse("20000000-0000-0000-0000-000000000033") }, destino = "Santos" }),
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return await _client.SendAsync(req);
        }

        (await Pedir(await TokenUsuarioComumAsync())).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Pedir((await SessaoAdmin.ObterAsync(_factory, _client)).Token)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
