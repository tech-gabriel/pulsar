using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>
/// Contrato de <c>GET /api/subprefeituras</c> e <c>GET /api/subprefeituras/{id}/previsao</c>,
/// que substituem no app as chamadas por zona (SP3). Cada teste que semeia previsão usa
/// subprefeituras só suas (índices distintos na lista ordenada por nome).
/// </summary>
public class SubprefeiturasControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly PulsarWebApplicationFactory _factory;
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public SubprefeiturasControllerTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Lista_SemToken_Retorna401()
    {
        var resposta = await _client.GetAsync("/api/subprefeituras");
        resposta.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Lista_TrazSoAsAtivas_ComZonaComoLegenda()
    {
        var token = await TokenUsuarioComumAsync();
        var inativa = await CriarSubprefeituraInativaAsync();

        var resposta = await GetComTokenAsync("/api/subprefeituras", token);

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        var subs = await resposta.Content.ReadFromJsonAsync<List<SubprefeituraResumoDto>>(JsonOpts);
        subs.Should().NotBeNull();

        int ativasNoBanco;
        using (var escopo = _factory.Services.CreateScope())
        {
            var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
            ativasNoBanco = await db.Subprefeituras.CountAsync(s => s.Ativa);
        }

        subs!.Should().HaveCount(ativasNoBanco);
        subs.Should().NotContain(s => s.Id == inativa);
        subs.Should().OnlyContain(s => !string.IsNullOrWhiteSpace(s.Zona),
            "a zona é a legenda de cada subprefeitura no app");
    }

    [Fact]
    public async Task Lista_SerializaOCampoZona()
    {
        var token = await TokenUsuarioComumAsync();
        var resposta = await GetComTokenAsync("/api/subprefeituras", token);

        // JSON cru: o front lê exatamente "zona"; renomear o campo tem que quebrar aqui.
        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var primeira = doc.RootElement.EnumerateArray().First();
        primeira.TryGetProperty("zona", out _).Should().BeTrue();
        primeira.TryGetProperty("faixaRisco", out _).Should().BeTrue();
        primeira.TryGetProperty("scoreAtual", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Previsao_SemToken_Retorna401()
    {
        var resposta = await _client.GetAsync($"/api/subprefeituras/{Guid.NewGuid()}/previsao");
        resposta.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Previsao_Inexistente_Retorna404()
    {
        var token = await TokenUsuarioComumAsync();
        var resposta = await GetComTokenAsync($"/api/subprefeituras/{Guid.NewGuid()}/previsao", token);
        resposta.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Previsao_SemColeta_Retorna200ComListaVazia()
    {
        var token = await TokenUsuarioComumAsync();
        var sub = (await SubprefeiturasPorNomeAsync())[5];

        var resposta = await GetComTokenAsync($"/api/subprefeituras/{sub.Id}/previsao", token);

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
        doc.RootElement.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Previsao_EDaPropriaSubprefeitura_NaoDaPiorVizinha()
    {
        var token = await TokenUsuarioComumAsync();
        var subs = await SubprefeiturasPorNomeAsync();
        var alvo = subs[0];
        var vizinha = subs.First(s => s.RegiaoId == alvo.RegiaoId && s.Id != alvo.Id);
        var instante = AgoraUtcEmSegundos().AddHours(2);

        await SemearAsync(alvo.Id, Faixa(instante, chuva: 2));
        await SemearAsync(vizinha.Id, Faixa(instante, chuva: 30));

        var resposta = await GetComTokenAsync($"/api/subprefeituras/{alvo.Id}/previsao", token);
        var faixas = await resposta.Content.ReadFromJsonAsync<List<FaixaPrevisaoDto>>(JsonOpts);

        faixas.Should().ContainSingle();
        faixas![0].ChuvaMm.Should().Be(2, "a previsão por zona mostrava o pior caso (30) e gerava falso alarme");
    }

    [Fact]
    public async Task Previsao_LimitaA8FaixasEmOrdemCrescente()
    {
        var token = await TokenUsuarioComumAsync();
        var sub = (await SubprefeiturasPorNomeAsync())[3];
        var baseUtc = AgoraUtcEmSegundos();

        // Fora de ordem de propósito: a ordenação tem que vir do serviço.
        await SemearAsync(sub.Id, Enumerable.Range(1, 10).Reverse()
            .Select(h => Faixa(baseUtc.AddHours(h * 3), chuva: h)).ToArray());

        var resposta = await GetComTokenAsync($"/api/subprefeituras/{sub.Id}/previsao", token);
        var faixas = await resposta.Content.ReadFromJsonAsync<List<FaixaPrevisaoDto>>(JsonOpts);

        faixas.Should().HaveCount(8);
        faixas!.Select(f => f.ChuvaMm).Should().Equal(1, 2, 3, 4, 5, 6, 7, 8);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private static PrevisaoClimatica Faixa(DateTime instante, double chuva) => new()
    {
        InstantePrevisto = instante,
        ChuvaMm = chuva,
        ProbabilidadeChuva = 0.5,
        VentoKmH = 10,
        RajadaKmH = null,
        TemperaturaC = 22,
        CondicaoCodigo = 500,
        CondicaoDescricao = "chuva leve",
        ColetadoEm = instante.AddHours(-3),
    };

    private static DateTime AgoraUtcEmSegundos()
    {
        var agora = DateTime.UtcNow;
        return new DateTime(agora.Ticks - (agora.Ticks % TimeSpan.TicksPerSecond), DateTimeKind.Utc);
    }

    private async Task<List<Subprefeitura>> SubprefeiturasPorNomeAsync()
    {
        using var escopo = _factory.Services.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
        var ativas = await db.Subprefeituras.Where(s => s.Ativa).AsNoTracking().ToListAsync();
        return [.. ativas.OrderBy(s => s.Nome, StringComparer.Ordinal)];
    }

    private async Task SemearAsync(Guid subprefeituraId, params PrevisaoClimatica[] linhas)
    {
        using var escopo = _factory.Services.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
        foreach (var l in linhas) l.SubprefeituraId = subprefeituraId;
        db.PrevisoesClimaticas.AddRange(linhas);
        await db.SaveChangesAsync();
    }

    private async Task<Guid> CriarSubprefeituraInativaAsync()
    {
        using var escopo = _factory.Services.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
        var regiaoId = await db.Regioes.Select(r => r.Id).FirstAsync();
        var sub = new Subprefeitura
        {
            RegiaoId = regiaoId,
            Nome = $"Desativada {Guid.NewGuid():N}",
            Latitude = -23.5,
            Longitude = -46.6,
            Ativa = false,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
        db.Subprefeituras.Add(sub);
        await db.SaveChangesAsync();
        return sub.Id;
    }

    private async Task<string> TokenUsuarioComumAsync()
    {
        var resposta = await _client.PostAsJsonAsync("/api/auth/cadastro", new CadastroRequestDto
        {
            Nome = "Teste",
            Email = $"subpref_{Guid.NewGuid()}@test.com",
            Senha = "Senha@123",
        });
        resposta.EnsureSuccessStatusCode();
        var sessao = await resposta.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        return sessao!.Token;
    }

    private async Task<HttpResponseMessage> GetComTokenAsync(string url, string token)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };
        return await _client.SendAsync(req);
    }
}
