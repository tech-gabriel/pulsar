using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

public class FavoritosControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public FavoritosControllerTests(PulsarWebApplicationFactory factory)
        => _client = factory.CreateClient();

    /// <summary>
    /// Regressão: adicionar favorito a um usuário já existente persistia via
    /// navegação e o EF emitia UPDATE (0 linhas) → 500. Deve retornar 201 e
    /// constar no GET.
    /// </summary>
    [Fact]
    public async Task AdicionarFavorito_RegiaoValida_Retorna201EConstaNaLista()
    {
        var (token, usuarioId) = await CadastrarAsync();
        var regiaoId = await PrimeiraRegiaoIdAsync(token);
        Autenticar(token);

        var post = await _client.PostAsJsonAsync(
            $"/api/usuarios/{usuarioId}/favoritos",
            new AdicionarFavoritoRequestDto { RegiaoId = regiaoId });

        post.StatusCode.Should().Be(HttpStatusCode.Created);
        var favorito = await post.Content.ReadFromJsonAsync<FavoritoDto>(JsonOpts);
        favorito!.RegiaoId.Should().Be(regiaoId);

        var lista = await _client.GetFromJsonAsync<List<FavoritoDto>>(
            $"/api/usuarios/{usuarioId}/favoritos", JsonOpts);
        lista.Should().ContainSingle(f => f.RegiaoId == regiaoId);

        Limpar();
    }

    [Fact]
    public async Task AdicionarFavorito_Duplicado_Retorna409()
    {
        var (token, usuarioId) = await CadastrarAsync();
        var regiaoId = await PrimeiraRegiaoIdAsync(token);
        Autenticar(token);
        var req = new AdicionarFavoritoRequestDto { RegiaoId = regiaoId };

        await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos", req);
        var dup = await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos", req);

        dup.StatusCode.Should().Be(HttpStatusCode.Conflict);
        Limpar();
    }

    [Fact]
    public async Task AdicionarFavorito_RegiaoInexistente_Retorna404()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);

        var resp = await _client.PostAsJsonAsync(
            $"/api/usuarios/{usuarioId}/favoritos",
            new AdicionarFavoritoRequestDto { RegiaoId = Guid.NewGuid() });

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        Limpar();
    }

    [Fact]
    public async Task AdicionarFavorito_DeOutroUsuario_Retorna403()
    {
        var (token, _) = await CadastrarAsync();
        var regiaoId = await PrimeiraRegiaoIdAsync(token);
        Autenticar(token);

        // Tenta favoritar em nome de outro usuário (id diferente do token).
        var resp = await _client.PostAsJsonAsync(
            $"/api/usuarios/{Guid.NewGuid()}/favoritos",
            new AdicionarFavoritoRequestDto { RegiaoId = regiaoId });

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        Limpar();
    }

    [Fact]
    public async Task RemoverFavorito_Existente_Retorna204ESomeDaLista()
    {
        var (token, usuarioId) = await CadastrarAsync();
        var regiaoId = await PrimeiraRegiaoIdAsync(token);
        Autenticar(token);
        await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos",
            new AdicionarFavoritoRequestDto { RegiaoId = regiaoId });

        var del = await _client.DeleteAsync($"/api/usuarios/{usuarioId}/favoritos/{regiaoId}");

        del.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var lista = await _client.GetFromJsonAsync<List<FavoritoDto>>(
            $"/api/usuarios/{usuarioId}/favoritos", JsonOpts);
        lista.Should().BeEmpty();
        Limpar();
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private async Task<(string token, Guid usuarioId)> CadastrarAsync()
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Fav", Email = $"fav_{Guid.NewGuid()}@test.com", Senha = "Senha@123" });
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        return (body!.Token, body.Usuario.Id);
    }

    private async Task<Guid> PrimeiraRegiaoIdAsync(string token)
    {
        Autenticar(token);
        var regioes = await _client.GetFromJsonAsync<List<RegiaoDto>>("/api/regioes", JsonOpts);
        Limpar();
        return regioes![0].Id;
    }

    private void Autenticar(string token)
        => _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private void Limpar()
        => _client.DefaultRequestHeaders.Authorization = null;
}
