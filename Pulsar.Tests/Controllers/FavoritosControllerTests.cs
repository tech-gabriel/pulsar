using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

public class FavoritosControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly PulsarWebApplicationFactory _factory;
    private static readonly Guid Mooca = Guid.Parse("20000000-0000-0000-0000-000000000008");
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public FavoritosControllerTests(PulsarWebApplicationFactory factory)
        {
        _factory = factory;
        _client = factory.CreateClient();
    }

    /// <summary>
    /// Regressão: adicionar favorito a um usuário já existente persistia via
    /// navegação e o EF emitia UPDATE (0 linhas) → 500. Deve retornar 201 e
    /// constar no GET.
    /// </summary>
    [Fact]
    public async Task AdicionarFavorito_SubprefeituraValida_Retorna201EConstaNaLista()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);

        var post = await _client.PostAsJsonAsync(
            $"/api/usuarios/{usuarioId}/favoritos",
            new AdicionarFavoritoRequestDto { SubprefeituraId = Mooca });

        post.StatusCode.Should().Be(HttpStatusCode.Created);
        var favorito = await post.Content.ReadFromJsonAsync<FavoritoDto>(JsonOpts);
        favorito!.SubprefeituraId.Should().Be(Mooca);
        favorito.Nome.Should().Be("Mooca");
        favorito.RegiaoNome.Should().Be("Leste");

        var lista = await _client.GetFromJsonAsync<List<FavoritoDto>>(
            $"/api/usuarios/{usuarioId}/favoritos", JsonOpts);
        lista.Should().ContainSingle(f => f.SubprefeituraId == Mooca);

        Limpar();
    }

    [Fact]
    public async Task AdicionarFavorito_Duplicado_Retorna409()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);
        var req = new AdicionarFavoritoRequestDto { SubprefeituraId = Mooca };

        await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos", req);
        var dup = await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos", req);

        dup.StatusCode.Should().Be(HttpStatusCode.Conflict);
        Limpar();
    }

    [Fact]
    public async Task AdicionarFavorito_SubprefeituraInexistente_Retorna404()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);

        var resp = await _client.PostAsJsonAsync(
            $"/api/usuarios/{usuarioId}/favoritos",
            new AdicionarFavoritoRequestDto { SubprefeituraId = Guid.NewGuid() });

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        Limpar();
    }

    [Fact]
    public async Task AdicionarFavorito_DeOutroUsuario_Retorna403()
    {
        var (token, _) = await CadastrarAsync();
        Autenticar(token);

        // Tenta favoritar em nome de outro usuário (id diferente do token).
        var resp = await _client.PostAsJsonAsync(
            $"/api/usuarios/{Guid.NewGuid()}/favoritos",
            new AdicionarFavoritoRequestDto { SubprefeituraId = Mooca });

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        Limpar();
    }

    [Fact]
    public async Task RemoverFavorito_Existente_Retorna204ESomeDaLista()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);
        await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos",
            new AdicionarFavoritoRequestDto { SubprefeituraId = Mooca });

        var del = await _client.DeleteAsync($"/api/usuarios/{usuarioId}/favoritos/{Mooca}");

        del.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var lista = await _client.GetFromJsonAsync<List<FavoritoDto>>(
            $"/api/usuarios/{usuarioId}/favoritos", JsonOpts);
        lista.Should().BeEmpty();
        Limpar();
    }

    [Fact]
    public async Task AdicionarFavorito_AcimaDoLimite_Retorna400ComMensagem()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);
        var subs = Enumerable.Range(1, 11)
            .Select(i => Guid.Parse($"20000000-0000-0000-0000-{i:D12}")).ToList();

        for (var i = 0; i < 10; i++)
            (await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos",
                new AdicionarFavoritoRequestDto { SubprefeituraId = subs[i] })).StatusCode.Should().Be(HttpStatusCode.Created);

        var resp = await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos",
            new AdicionarFavoritoRequestDto { SubprefeituraId = subs[10] });

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("Você já acompanha 10 subprefeituras");
        Limpar();
    }

    [Fact]
    public async Task UsuarioExcluido_FavoritasSomemPorCascata()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);
        await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos",
            new AdicionarFavoritoRequestDto { SubprefeituraId = Mooca });
        Limpar();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
        db.Usuarios.Remove(await db.Usuarios.FindAsync(usuarioId) ?? throw new InvalidOperationException());
        await db.SaveChangesAsync();

        (await db.UsuarioSubprefeituras.AnyAsync(f => f.UsuarioId == usuarioId)).Should().BeFalse();
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private async Task<(string token, Guid usuarioId)> CadastrarAsync()
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Fav", Email = $"fav_{Guid.NewGuid()}@test.com", Senha = "Senha@123" });
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        return (body!.Token, body.Usuario.Id);
    }

    private void Autenticar(string token)
        => _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private void Limpar()
        => _client.DefaultRequestHeaders.Authorization = null;
}
