using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

public class LocaisControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly PulsarWebApplicationFactory _factory;
    private static readonly Guid Mooca = Guid.Parse("20000000-0000-0000-0000-000000000008");
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public LocaisControllerTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SalvarCasa_Valida_Retorna200ComFavoritaAdicionada()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);

        var resp = await Salvar(usuarioId, "casa", Mooca);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<SalvarLocalResponseDto>(JsonOpts);
        body!.Local.Tipo.Should().Be(TipoLocal.CASA);
        body.Local.SubprefeituraNome.Should().Be("Mooca");
        body.Favorita.Should().Be("ADICIONADA");
        (await Favoritos(usuarioId)).Should().ContainSingle(f => f.SubprefeituraId == Mooca);
        (await Locais(usuarioId)).Should().HaveCount(1);
        Limpar();
    }

    [Fact]
    public async Task SalvarCasa_SubprefeituraJaFavorita_RetornaJaEra()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);
        await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos",
            new AdicionarFavoritoRequestDto { SubprefeituraId = Mooca });

        var body = await (await Salvar(usuarioId, "casa", Mooca)).Content.ReadFromJsonAsync<SalvarLocalResponseDto>(JsonOpts);

        body!.Favorita.Should().Be("JA_ERA");
        (await Favoritos(usuarioId)).Count(f => f.SubprefeituraId == Mooca).Should().Be(1);
        Limpar();
    }

    [Fact]
    public async Task SalvarCasa_ComDezFavoritas_SalvaERetornaTeto()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);
        foreach (var i in Enumerable.Range(1, 11).Where(n => n != 8))
            (await _client.PostAsJsonAsync($"/api/usuarios/{usuarioId}/favoritos",
                new AdicionarFavoritoRequestDto { SubprefeituraId = Guid.Parse($"20000000-0000-0000-0000-{i:D12}") }))
                .StatusCode.Should().Be(HttpStatusCode.Created);

        var resp = await Salvar(usuarioId, "casa", Mooca);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await resp.Content.ReadFromJsonAsync<SalvarLocalResponseDto>(JsonOpts))!.Favorita.Should().Be("TETO");
        (await Locais(usuarioId)).Should().ContainSingle(l => l.Tipo == TipoLocal.CASA);
        (await Favoritos(usuarioId)).Should().HaveCount(10);
        Limpar();
    }

    [Fact]
    public async Task TrocarCasa_AtualizaSemDuplicar()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);
        var outra = Guid.Parse("20000000-0000-0000-0000-000000000003");
        await Salvar(usuarioId, "casa", Mooca, "Rua Velha, 1");

        var resp = await Salvar(usuarioId, "casa", outra, "Rua Nova, 2");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var locais = await Locais(usuarioId);
        locais.Should().ContainSingle(l => l.Tipo == TipoLocal.CASA);
        locais[0].Rotulo.Should().Be("Rua Nova, 2");
        locais[0].SubprefeituraId.Should().Be(outra);
        (await Favoritos(usuarioId)).Select(f => f.SubprefeituraId).Should().BeEquivalentTo(new[] { Mooca, outra });
        Limpar();
    }

    [Fact]
    public async Task SalvarCasa_ForaDeSp_Retorna400()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);

        var resp = await _client.PutAsJsonAsync($"/api/usuarios/{usuarioId}/locais/casa",
            new SalvarLocalRequestDto { Latitude = -22.9056, Longitude = -47.0608, Rotulo = "Campinas", SubprefeituraId = Mooca });

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("Esse endereço fica fora da cidade de São Paulo.");
        (await Locais(usuarioId)).Should().BeEmpty();
        Limpar();
    }

    [Fact]
    public async Task SalvarCasa_RotuloGigante_Retorna400()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);

        var resp = await Salvar(usuarioId, "casa", Mooca, new string('a', 201));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("Endereço inválido.");
        Limpar();
    }

    [Fact]
    public async Task SalvarCasa_SubprefeituraInexistente_Retorna400()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);

        var resp = await Salvar(usuarioId, "casa", Guid.NewGuid());

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("Subprefeitura não encontrada.");
        Limpar();
    }

    [Fact]
    public async Task SalvarCasa_DeOutroUsuario_Retorna403()
    {
        var (token, _) = await CadastrarAsync();
        Autenticar(token);

        (await Salvar(Guid.NewGuid(), "casa", Mooca)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        Limpar();
    }

    [Fact]
    public async Task ObterLocais_DeOutroUsuario_Retorna403()
    {
        var (token, _) = await CadastrarAsync();
        Autenticar(token);

        (await _client.GetAsync($"/api/usuarios/{Guid.NewGuid()}/locais")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        Limpar();
    }

    [Fact]
    public async Task SalvarTipoDesconhecido_Retorna404()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);

        (await Salvar(usuarioId, "academia", Mooca)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        Limpar();
    }

    [Fact]
    public async Task ApagarCasa_Existente_Retorna204ESomeEFavoritaFica()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);
        await Salvar(usuarioId, "casa", Mooca);

        var del = await _client.DeleteAsync($"/api/usuarios/{usuarioId}/locais/casa");

        del.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await Locais(usuarioId)).Should().BeEmpty();
        (await Favoritos(usuarioId)).Should().ContainSingle(f => f.SubprefeituraId == Mooca);
        Limpar();
    }

    [Fact]
    public async Task ApagarCasa_Inexistente_Retorna404()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);

        (await _client.DeleteAsync($"/api/usuarios/{usuarioId}/locais/casa")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        Limpar();
    }

    [Fact]
    public async Task UsuarioExcluido_LocaisSomemPorCascata()
    {
        var (token, usuarioId) = await CadastrarAsync();
        Autenticar(token);
        await Salvar(usuarioId, "casa", Mooca);
        Limpar();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
        db.Usuarios.Remove(await db.Usuarios.FindAsync(usuarioId) ?? throw new InvalidOperationException());
        await db.SaveChangesAsync();

        (await db.LocaisSalvos.AnyAsync(l => l.UsuarioId == usuarioId)).Should().BeFalse();
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private Task<HttpResponseMessage> Salvar(Guid usuarioId, string tipo, Guid subId, string rotulo = "R. da Mooca, 100")
        => _client.PutAsJsonAsync($"/api/usuarios/{usuarioId}/locais/{tipo}",
            new SalvarLocalRequestDto { Latitude = -23.5505, Longitude = -46.5967, Rotulo = rotulo, SubprefeituraId = subId });

    private async Task<List<LocalSalvoDto>> Locais(Guid usuarioId)
        => (await _client.GetFromJsonAsync<List<LocalSalvoDto>>($"/api/usuarios/{usuarioId}/locais", JsonOpts))!;

    private async Task<List<FavoritoDto>> Favoritos(Guid usuarioId)
        => (await _client.GetFromJsonAsync<List<FavoritoDto>>($"/api/usuarios/{usuarioId}/favoritos", JsonOpts))!;

    private async Task<(string token, Guid usuarioId)> CadastrarAsync()
    {
        var resp = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Loc", Email = $"loc_{Guid.NewGuid()}@test.com", Senha = "Senha@123" });
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        return (body!.Token, body.Usuario.Id);
    }

    private void Autenticar(string token)
        => _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private void Limpar()
        => _client.DefaultRequestHeaders.Authorization = null;
}
