using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
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

    [Fact]
    public async Task Lista_TrazOsAlagamentosAtivosDoCge_SoOsVistosHaPouco()
    {
        var token = await TokenUsuarioComumAsync();
        Guid lapa, butanta;
        using (var escopo = _factory.Services.CreateScope())
        {
            var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
            lapa = (await db.Subprefeituras.SingleAsync(s => s.Nome == "Lapa")).Id;
            butanta = (await db.Subprefeituras.SingleAsync(s => s.Nome == "Butantã")).Id;
            var agora = DateTime.UtcNow;
            db.PontosAlagamentoCge.AddRange(
                new PontoAlagamentoCge { SubprefeituraId = lapa, Dia = DateOnly.FromDateTime(agora), Via = "MARGINAL TIETE ASCB EXPRESSA", Referencia = "PTE ATTILIO FONTANA", Ativo = true, VistoEm = agora, InicioUtc = agora.AddHours(-1) },
                // Ativo, mas o CGE não confirma há 2 h: não aparece.
                new PontoAlagamentoCge { SubprefeituraId = butanta, Dia = DateOnly.FromDateTime(agora), Via = "AV ELISEU DE ALMEIDA", Ativo = true, VistoEm = agora.AddHours(-2), InicioUtc = agora.AddHours(-3) });
            await db.SaveChangesAsync();
        }

        var resposta = await GetComTokenAsync("/api/subprefeituras", token);

        // JSON cru: o front lê exatamente "alagamentosCge", "via" e "referencia".
        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        JsonElement Da(Guid id) => doc.RootElement.EnumerateArray().Single(e => e.GetProperty("id").GetGuid() == id);
        var pontosLapa = Da(lapa).GetProperty("alagamentosCge");
        pontosLapa.GetArrayLength().Should().Be(1);
        pontosLapa[0].GetProperty("via").GetString().Should().Be("Marginal Tiete Ascb Expressa");
        pontosLapa[0].GetProperty("referencia").GetString().Should().Be("Pte Attilio Fontana");
        Da(butanta).GetProperty("alagamentosCge").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Lista_TrazAChuvaMedidaDoPostoDoCge_ENullOndeNaoHaDadoMedido()
    {
        var token = await TokenUsuarioComumAsync();
        Guid lapa, casaVerde, parelheiros;
        DateTime agora;
        using (var escopo = _factory.Services.CreateScope())
        {
            var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
            lapa = (await db.Subprefeituras.SingleAsync(s => s.Nome == "Lapa")).Id;
            casaVerde = (await db.Subprefeituras.SingleAsync(s => s.Nome == "Casa Verde-Limão-Cachoeirinha")).Id;
            parelheiros = (await db.Subprefeituras.SingleAsync(s => s.Nome == "Parelheiros")).Id;
            agora = DateTime.UtcNow;
            // Posto 1000848 = Lapa. Acumulado 5,0 → 9,0 em 15 minutos.
            db.LeiturasEstacaoCge.AddRange(
                new LeituraEstacaoCge { Posto = 1000848, ColetadoEm = agora.AddMinutes(-15), ChuvaPeriodoMm = 5.0, TemperaturaC = 20.0 },
                new LeituraEstacaoCge { Posto = 1000848, ColetadoEm = agora, ChuvaPeriodoMm = 9.0, TemperaturaC = 19.8 });
            await db.SaveChangesAsync();
        }

        var resposta = await GetComTokenAsync("/api/subprefeituras", token);

        // JSON cru: o front lê exatamente estes nomes.
        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        JsonElement Da(Guid id) => doc.RootElement.EnumerateArray().Single(e => e.GetProperty("id").GetGuid() == id);

        var medida = Da(lapa).GetProperty("chuvaMedida");
        medida.GetProperty("mm15").GetDouble().Should().Be(4.0);
        medida.GetProperty("mm60").ValueKind.Should().Be(JsonValueKind.Null, "não há leitura de uma hora atrás");
        medida.GetProperty("acumuladoPeriodoMm").GetDouble().Should().Be(9.0);
        medida.GetProperty("posto").GetString().Should().Be("Lapa");
        medida.GetProperty("vizinho").GetBoolean().Should().BeFalse();
        medida.GetProperty("coletadoEm").GetDateTime().Should().BeCloseTo(agora, TimeSpan.FromSeconds(1));
        medida.GetProperty("coletadoEm").GetString().Should().EndWith("Z", "o front converte pelo fuso do navegador");

        // Sem posto próprio, ao lado da Lapa: vem o dado dela, marcado como vizinho.
        Da(casaVerde).GetProperty("chuvaMedida").GetProperty("vizinho").GetBoolean().Should().BeTrue();
        Da(casaVerde).GetProperty("chuvaMedida").GetProperty("posto").GetString().Should().Be("Lapa");

        // Longe de qualquer posto com leitura: sem dado medido, o app mostra "estimado".
        Da(parelheiros).GetProperty("chuvaMedida").ValueKind.Should().Be(JsonValueKind.Null);
    }

    /// <summary>
    /// Estações do CEMADEN no extremo leste e no extremo noroeste, longe dos postos do CGE que
    /// os outros testes desta classe semeiam (o banco é um só para a classe).
    /// </summary>
    private async Task<(Guid Tiradentes, Guid Perus)> SemearCemadenAsync()
    {
        using var escopo = _factory.Services.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
        var tiradentes = await db.Subprefeituras.SingleAsync(s => s.Nome == "Cidade Tiradentes");
        var perus = await db.Subprefeituras.SingleAsync(s => s.Nome == "Perus-Anhanguera");
        if (!await db.EstacoesCemaden.AnyAsync())
        {
            var agora = DateTime.UtcNow;
            db.EstacoesCemaden.AddRange(
                new EstacaoCemaden { CodEstacao = "T1", CodIbge = "3550308", Nome = "Estação Tiradentes", Latitude = tiradentes.Latitude, Longitude = tiradentes.Longitude, ConferidoEm = agora },
                new EstacaoCemaden { CodEstacao = "P1", CodIbge = "3550308", Nome = "Estação Perus", Latitude = perus.Latitude, Longitude = perus.Longitude, ConferidoEm = agora });
            db.LeiturasEstacaoCemaden.AddRange(
                new LeituraEstacaoCemaden { CodEstacao = "T1", DataHora = agora, ColetadoEm = agora, Acc1h = 2.5, Acc24h = 12.0 },
                new LeituraEstacaoCemaden { CodEstacao = "P1", DataHora = agora, ColetadoEm = agora, Acc1h = null, Acc24h = 8.0 });
            await db.SaveChangesAsync();
        }
        return (tiradentes.Id, perus.Id);
    }

    [Fact]
    public async Task Lista_SemCge_TrazAUltimaHoraEAs24hDoCemaden()
    {
        var token = await TokenUsuarioComumAsync();
        var (tiradentes, perus) = await SemearCemadenAsync();

        var resposta = await GetComTokenAsync("/api/subprefeituras", token);

        // JSON cru: o front lê exatamente estes nomes.
        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        JsonElement Da(Guid id) => doc.RootElement.EnumerateArray().Single(e => e.GetProperty("id").GetGuid() == id);

        var medida = Da(tiradentes).GetProperty("chuvaMedida");
        medida.GetProperty("fonte").GetString().Should().Be("cemaden");
        medida.GetProperty("mm15").ValueKind.Should().Be(JsonValueKind.Null, "o CEMADEN não tem janela de 15 minutos");
        medida.GetProperty("mm60").GetDouble().Should().Be(2.5);
        medida.GetProperty("acumuladoPeriodoMm").ValueKind.Should().Be(JsonValueKind.Null);
        medida.GetProperty("posto").GetString().Should().Be("Estação Tiradentes");
        medida.GetProperty("coletadoEm").GetString().Should().EndWith("Z");

        var h24 = Da(tiradentes).GetProperty("chuva24h");
        h24.GetProperty("mm").GetDouble().Should().Be(12.0);
        h24.GetProperty("estacao").GetString().Should().Be("Estação Tiradentes");
        h24.GetProperty("medidoEm").GetString().Should().EndWith("Z");

        // Estação só com as 24 h: não há "agora" para afirmar, mas as 24 h aparecem.
        Da(perus).GetProperty("chuvaMedida").ValueKind.Should().Be(JsonValueKind.Null);
        Da(perus).GetProperty("chuva24h").GetProperty("mm").GetDouble().Should().Be(8.0);
    }

    [Fact]
    public async Task Lista_CemadenFalha_AbreIgualSemAs24h()
    {
        var token = await TokenUsuarioComumAsync();
        var (tiradentes, _) = await SemearCemadenAsync();
        var quebrado = new Moq.Mock<Pulsar.API.Services.Interfaces.ICemadenService>();
        quebrado.Setup(c => c.ObterPorSubprefeituraAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("banco fora"));
        using var client = _factory
            .WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddScoped(_ => quebrado.Object)))
            .CreateClient();
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/subprefeituras")
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };

        var resposta = await client.SendAsync(req);

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var sub = doc.RootElement.EnumerateArray().Single(e => e.GetProperty("id").GetGuid() == tiradentes);
        sub.GetProperty("chuvaMedida").ValueKind.Should().Be(JsonValueKind.Null);
        sub.GetProperty("chuva24h").ValueKind.Should().Be(JsonValueKind.Null);
    }
}
