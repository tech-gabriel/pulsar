using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>Avaliação de rota. Factory própria: o cache da série de chuva é singleton do container.</summary>
public class RotaControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private const string Rota = "/api/rota/avaliar";
    private readonly PulsarWebApplicationFactory _factory;

    public RotaControllerTests(PulsarWebApplicationFactory factory) => _factory = factory;

    private static async Task<HttpClient> LogadoAsync(PulsarWebApplicationFactory f)
    {
        var client = f.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto { Nome = "Rota", Email = $"rota_{Guid.NewGuid()}@test.com", Senha = "Senha@123" });
        using var body = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.RootElement.GetProperty("token").GetString());
        return client;
    }

    private static async Task<List<Guid>> IdsAsync(PulsarWebApplicationFactory f, params string[] nomes)
    {
        using var scope = f.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
        var subs = await db.Subprefeituras.Where(s => nomes.Contains(s.Nome)).ToListAsync();
        return [.. nomes.Select(n => subs.Single(s => s.Nome == n).Id)];
    }

    [Fact]
    public async Task Avaliar_SemLogin_401()
    {
        var resp = await _factory.CreateClient().PostAsJsonAsync(Rota, new AvaliarRotaRequest([Guid.NewGuid()]));
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Avaliar_ListaVazia_400()
    {
        var client = await LogadoAsync(_factory);
        (await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest([]))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Avaliar_IdInexistente_400()
    {
        var client = await LogadoAsync(_factory);
        (await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest([Guid.NewGuid()]))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Avaliar_Mais32_400()
    {
        var client = await LogadoAsync(_factory);
        var ids = Enumerable.Range(0, 33).Select(_ => Guid.NewGuid()).ToList();
        (await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest(ids))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Avaliar_PontoCgeAtivoNaMooca_DevolveEsperar_ComTrechoDecisivoMooca()
    {
        // Factory nova: o ponto semeado não pode vazar para os outros testes.
        using var f = new PulsarWebApplicationFactory();
        var mooca = (await IdsAsync(f, "Mooca"))[0];
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            var agora = DateTime.UtcNow;
            db.PontosAlagamentoCge.Add(new PontoAlagamentoCge
            {
                SubprefeituraId = mooca, Dia = DateOnly.FromDateTime(agora), Via = "RUA DA MOOCA",
                Referencia = "ALTURA DO 1000", InicioUtc = agora.AddMinutes(-20), Ativo = true, VistoEm = agora, CriadoEm = agora,
            });
            await db.SaveChangesAsync();
        }
        var client = await LogadoAsync(f);

        var resp = await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest([mooca]));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("estado").GetString().Should().Be("Esperar");
        json.RootElement.GetProperty("trechoDecisivoId").GetGuid().Should().Be(mooca);
        json.RootElement.GetProperty("trechos")[0].GetProperty("alagandoCge").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Avaliar_OpenMeteoFalhando_Responde200SemHoras()
    {
        // Factory nova: o cache da série é singleton e a falha não pode ser mascarada por um acerto anterior.
        using var f = new PulsarWebApplicationFactory();
        f.ChuvaReferencia.Falhar = true;
        var ids = await IdsAsync(f, "Mooca");
        var client = await LogadoAsync(f);

        var resp = await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest(ids));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("horas").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Avaliar_DevolveTrechosNaOrdemPedida()
    {
        var ids = await IdsAsync(_factory, "Pinheiros", "Mooca", "Sé");
        var client = await LogadoAsync(_factory);

        var resp = await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest(ids));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("trechos").EnumerateArray()
            .Select(t => t.GetProperty("subprefeituraId").GetGuid()).Should().Equal(ids);
    }

    [Fact]
    public async Task Avaliar_OpenMeteoComTimeout_Responde200SemHoras()
    {
        using var f = new PulsarWebApplicationFactory();
        f.ChuvaReferencia.FalharComTimeout = true;
        var ids = await IdsAsync(f, "Mooca");
        var client = await LogadoAsync(f);

        var resp = await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest(ids));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("horas").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Avaliar_OpenMeteoFalhando_GuardaAFalhaEmCache()
    {
        using var f = new PulsarWebApplicationFactory();
        f.ChuvaReferencia.Falhar = true;
        var ids = await IdsAsync(f, "Mooca");
        var client = await LogadoAsync(f);

        await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest(ids));
        await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest(ids));

        f.ChuvaReferencia.Chamadas.Should().Be(1);
    }

    [Fact]
    public async Task Avaliar_ComChuvaForteNaProximaHora_DevolveComAtencaoEFaixaDeHoras()
    {
        using var f = new PulsarWebApplicationFactory();
        var agora = DateTime.UtcNow;
        var horaAtual = new DateTime(agora.Year, agora.Month, agora.Day, agora.Hour, 0, 0, DateTimeKind.Utc);
        // Chuva pesada da próxima hora em diante, nas chaves de hora cheia UTC como o Open-Meteo devolve.
        f.ChuvaReferencia.SerieParaTodos = Enumerable.Range(0, 13)
            .ToDictionary(i => horaAtual.AddHours(i), i => i == 0 ? 0.0 : 80.0);
        var mooca = (await IdsAsync(f, "Mooca"))[0];
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            var leitura = new LeituraClimatica
            {
                SubprefeituraId = mooca, Timestamp = agora.AddMinutes(-5), ChuvaMmH = 0, VentoKmH = 5,
                VisibilidadeKm = 10, IndiceUv = 1, TemperaturaC = 20, SensacaoTermica = 20, Umidade = 60,
            };
            db.LeiturasClimaticas.Add(leitura);
            db.ScoresPerigo.Add(new ScorePerigo
            {
                SubprefeituraId = mooca, LeituraId = leitura.Id, Timestamp = agora.AddMinutes(-5),
                Valor = 5, Faixa = Pulsar.API.Domain.Enums.FaixaRisco.BAIXO,
            });
            await db.SaveChangesAsync();
        }
        var client = await LogadoAsync(f);

        var resp = await client.PostAsJsonAsync(Rota, new AvaliarRotaRequest([mooca]));

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        json.RootElement.GetProperty("estado").GetString().Should().Be("ComAtencao");
        var horas = json.RootElement.GetProperty("horas").EnumerateArray()
            .Select(h => h.GetProperty("inicioUtc").GetDateTime()).ToList();
        horas.Should().NotBeEmpty().And.BeInAscendingOrder();
        horas.Count.Should().BeLessThanOrEqualTo(Pulsar.API.Services.Rota.LimiaresRota.HorasNaFaixa);
    }

    private const string Aviso = "/api/rota/aviso";

    [Fact]
    public async Task PedirAviso_SemLogin_401()
    {
        var resp = await _factory.CreateClient().PostAsJsonAsync(Aviso, new PedirAvisoRotaRequest([Guid.NewGuid()], "Penha"));
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PedirAviso_DestinoVazio_400()
    {
        var ids = await IdsAsync(_factory, "Mooca");
        var client = await LogadoAsync(_factory);
        (await client.PostAsJsonAsync(Aviso, new PedirAvisoRotaRequest(ids, "  "))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PedirAviso_Valido_204_ECancelarAviso_204()
    {
        var ids = await IdsAsync(_factory, "Mooca");
        var client = await LogadoAsync(_factory);

        (await client.PostAsJsonAsync(Aviso, new PedirAvisoRotaRequest(ids, "Penha"))).StatusCode.Should().Be(HttpStatusCode.NoContent);
        using (var scope = _factory.Services.CreateScope())
            (await scope.ServiceProvider.GetRequiredService<PulsarDbContext>().PedidosAvisoRota.CountAsync(p => p.Destino == "Penha")).Should().BeGreaterThan(0);

        (await client.DeleteAsync(Aviso)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task CancelarAviso_204()
    {
        var client = await LogadoAsync(_factory);
        (await client.DeleteAsync(Aviso)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
