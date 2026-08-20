using System.Globalization;
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
/// Autorização, contrato e limites de <c>GET /api/regioes/{id}/previsao</c>. A rota é
/// separada de <c>GET /api/regioes</c> de propósito: aquela roda em toda página pelo
/// AlertasProvider, e oito faixas por região ali engordariam um payload global para
/// servir uma tela só.
/// </summary>
public class RegioesPrevisaoControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    /// <summary>Faixas que a rota devolve no máximo. Espelha a regra do controller (24h).</summary>
    private const int MaxFaixasEsperado = 8;

    /// <summary>
    /// Cada teste que semeia previsão usa uma região só sua: a fixture é compartilhada
    /// pela classe e a ordem dos testes não é garantida, então o teste da lista vazia
    /// precisa de uma região que ninguém mais suja.
    /// </summary>
    private const int RegioesNecessarias = 3;

    private static readonly string[] CamposDaFaixa =
    [
        "instantePrevisto", "chuvaMm", "probabilidadeChuva", "ventoKmH",
        "rajadaKmH", "temperaturaC", "condicaoCodigo", "condicaoDescricao", "coletadoEm"
    ];

    private readonly PulsarWebApplicationFactory _factory;
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public RegioesPrevisaoControllerTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Previsao_SemToken_Retorna401()
    {
        var resposta = await _client.GetAsync($"/api/regioes/{Guid.NewGuid()}/previsao");

        resposta.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Previsao_RegiaoInexistente_Retorna404()
    {
        var token = await TokenUsuarioComumAsync();

        var resposta = await GetComTokenAsync($"/api/regioes/{Guid.NewGuid()}/previsao", token);

        resposta.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Previsao_RegiaoSemColeta_Retorna200ComListaVazia()
    {
        var token = await TokenUsuarioComumAsync();
        var regiao = (await ObterRegioesAsync(token))[0];

        var resposta = await GetComTokenAsync($"/api/regioes/{regiao.Id}/previsao", token);

        // Lista vazia é resposta legítima, e não erro: nos primeiros minutos depois de um
        // deploy, e sempre que a retenção esvazia, é exatamente esse o estado do banco.
        resposta.StatusCode.Should().Be(HttpStatusCode.OK);

        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array,
            "o corpo é sempre um array, mesmo vazio: o front não deve tratar dois formatos");
        doc.RootElement.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Previsao_ComColeta_Retorna200ComOsCamposDaFaixaEmOrdemCrescente()
    {
        var token = await TokenUsuarioComumAsync();
        var regiao = (await ObterRegioesAsync(token))[1];

        var baseUtc = AgoraUtcEmSegundos();
        var instanteCedo = baseUtc.AddHours(1);
        var instanteTarde = baseUtc.AddHours(4);
        var coletadoEm = baseUtc.AddMinutes(-20);

        // Semeadas fora de ordem de propósito: a ordenação crescente do corpo tem que vir
        // do serviço, e não da ordem em que as linhas entraram no banco.
        await SemearPrevisaoAsync(regiao.Id,
            new PrevisaoClimatica
            {
                InstantePrevisto = instanteTarde,
                ChuvaMm = 3.25,
                ProbabilidadeChuva = 0.35,
                VentoKmH = 11.1,
                RajadaKmH = null,
                TemperaturaC = 23.75,
                CondicaoCodigo = 500,
                CondicaoDescricao = "chuva leve",
                ColetadoEm = coletadoEm,
            },
            new PrevisaoClimatica
            {
                // Valores distintos entre si de propósito: se o mapeamento trocar dois
                // campos de lugar (vento por rajada, por exemplo), as asserções abaixo caem.
                InstantePrevisto = instanteCedo,
                ChuvaMm = 12.5,
                ProbabilidadeChuva = 0.8,
                VentoKmH = 33.3,
                RajadaKmH = 48.6,
                TemperaturaC = 19.4,
                CondicaoCodigo = 502,
                CondicaoDescricao = "chuva forte",
                ColetadoEm = coletadoEm,
            });

        var resposta = await GetComTokenAsync($"/api/regioes/{regiao.Id}/previsao", token);

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);

        // JSON cru de propósito: desserializar em FaixaPrevisaoDto faria um campo renomeado
        // cair no default (0, null, "") e o teste passaria sem que o contrato existisse.
        // A Task 13 escreve a interface TypeScript a partir exatamente destes nomes.
        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        doc.RootElement.ValueKind.Should().Be(JsonValueKind.Array);
        doc.RootElement.GetArrayLength().Should().Be(2);

        var primeira = doc.RootElement[0];
        foreach (var campo in CamposDaFaixa)
        {
            primeira.TryGetProperty(campo, out _).Should()
                .BeTrue($"o contrato da faixa inclui '{campo}'");
        }

        LerInstanteUtc(primeira.GetProperty("instantePrevisto")).Should().Be(instanteCedo,
            "a faixa mais próxima vem primeiro, independente da ordem de gravação");
        primeira.GetProperty("chuvaMm").GetDouble().Should().Be(12.5);
        primeira.GetProperty("probabilidadeChuva").GetDouble().Should().Be(0.8);
        primeira.GetProperty("ventoKmH").GetDouble().Should().Be(33.3);
        primeira.GetProperty("rajadaKmH").GetDouble().Should().Be(48.6);
        primeira.GetProperty("temperaturaC").GetDouble().Should().Be(19.4);
        primeira.GetProperty("condicaoCodigo").GetInt32().Should().Be(502);
        primeira.GetProperty("condicaoDescricao").GetString().Should().Be("chuva forte");
        LerInstanteUtc(primeira.GetProperty("coletadoEm")).Should().Be(coletadoEm);

        var segunda = doc.RootElement[1];
        LerInstanteUtc(segunda.GetProperty("instantePrevisto")).Should().Be(instanteTarde);

        // A API omite `wind.gust` com frequência. O campo tem que chegar como null explícito,
        // e não sumir do objeto: a Task 13 tipa rajadaKmH como `number | null`.
        segunda.GetProperty("rajadaKmH").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Previsao_ComMaisFaixasQueOLimite_DevolveApenasAsOitoPrimeiras()
    {
        const int FaixasSemeadas = MaxFaixasEsperado + 2;

        var token = await TokenUsuarioComumAsync();
        var regiao = (await ObterRegioesAsync(token))[2];

        var baseUtc = AgoraUtcEmSegundos();
        // Passo de 3h porque é a granularidade real do plano grátis do OpenWeatherMap.
        var instantes = Enumerable.Range(0, FaixasSemeadas)
            .Select(i => baseUtc.AddHours(1 + (3 * i)))
            .ToList();

        await SemearPrevisaoAsync(regiao.Id, instantes.Select(instante => new PrevisaoClimatica
        {
            InstantePrevisto = instante,
            ChuvaMm = 1.0,
            ProbabilidadeChuva = 0.2,
            VentoKmH = 5.0,
            TemperaturaC = 20.0,
            CondicaoCodigo = 800,
            CondicaoDescricao = "céu limpo",
            ColetadoEm = baseUtc,
        }).ToArray());

        var resposta = await GetComTokenAsync($"/api/regioes/{regiao.Id}/previsao", token);

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);

        using var doc = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        doc.RootElement.GetArrayLength().Should().Be(MaxFaixasEsperado,
            "a rota corta em 8 faixas de 3h, ou seja 24h");

        var recebidos = doc.RootElement.EnumerateArray()
            .Select(f => LerInstanteUtc(f.GetProperty("instantePrevisto")))
            .ToList();

        // Fronteira pelos dois lados, em valores adjacentes: a oitava faixa entra e a
        // nona fica de fora. Só o tamanho não distingue "as 8 primeiras" de "8 quaisquer".
        recebidos.Should().Equal(instantes.Take(MaxFaixasEsperado));
        recebidos.Should().NotContain(instantes[MaxFaixasEsperado],
            "a nona faixa está além das 24h que o painel mostra");
    }

    // ── Helpers ────────────────────────────────────────────────

    /// <summary>
    /// Agora em UTC truncado no segundo. Sem truncar, a comparação do instante de volta
    /// do banco depende da precisão de fração que cada provider preserva.
    /// </summary>
    private static DateTime AgoraUtcEmSegundos()
    {
        var agora = DateTime.UtcNow;
        return new DateTime(
            agora.Ticks - (agora.Ticks % TimeSpan.TicksPerSecond), DateTimeKind.Utc);
    }

    /// <summary>
    /// Lê um instante do JSON como UTC. O backend só serializa UTC, mas o sufixo Z depende
    /// do provider: em produção a coluna é timestamptz e o Npgsql devolve Kind=Utc, então
    /// o Z aparece; no SQLite destes testes o Kind se perde na volta do banco e o Z some.
    /// Sem Z o valor continua sendo UTC, e é por isso que aqui se carimba o Kind em vez de
    /// converter: ToUniversalTime trataria o instante como hora local e deslocaria tudo
    /// pelo fuso da máquina (UTC-3 aqui). Cultura invariante pelo mesmo motivo: pt-BR.
    /// </summary>
    private static DateTime LerInstanteUtc(JsonElement elemento)
    {
        var texto = elemento.GetString();
        texto.Should().NotBeNull("o instante é serializado como string ISO-8601");

        var valor = DateTime.Parse(
            texto!, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);

        return valor.Kind == DateTimeKind.Utc
            ? valor
            : DateTime.SpecifyKind(valor, DateTimeKind.Utc);
    }

    /// <summary>
    /// Grava faixas direto no banco da fixture, na primeira subprefeitura da região. A
    /// coleta de verdade depende do OpenWeatherMap, e o que se prova aqui é o contrato
    /// da rota, não a coleta.
    /// </summary>
    private async Task SemearPrevisaoAsync(Guid regiaoId, params PrevisaoClimatica[] linhas)
    {
        using var escopo = _factory.Services.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();

        // First e não FirstOrDefault: região sem subprefeitura é bug de seed, e o teste
        // deve gritar em vez de seguir semeando nada.
        var subprefeituraId = await db.Subprefeituras
            .Where(s => s.RegiaoId == regiaoId)
            .OrderBy(s => s.Nome)
            .Select(s => s.Id)
            .FirstAsync();

        foreach (var linha in linhas)
            linha.SubprefeituraId = subprefeituraId;

        db.PrevisoesClimaticas.AddRange(linhas);
        await db.SaveChangesAsync();
    }

    /// <summary>Regiões do seed, em ordem estável por nome (ordinal, não pela cultura).</summary>
    private async Task<IReadOnlyList<RegiaoDto>> ObterRegioesAsync(string token)
    {
        var resposta = await GetComTokenAsync("/api/regioes", token);
        resposta.EnsureSuccessStatusCode();

        var regioes = await resposta.Content.ReadFromJsonAsync<List<RegiaoDto>>(JsonOpts);
        regioes.Should().NotBeNull();
        regioes!.Count.Should().BeGreaterThanOrEqualTo(RegioesNecessarias,
            "cada teste que semeia previsão precisa de uma região só sua");
        regioes.Should().OnlyContain(r => r.Id != Guid.Empty,
            "um id que chegasse zerado faria os testes baterem numa região inexistente");

        // A listagem ordena por score, que aqui é zero em todas: sem reordenar, qual região
        // cai em cada índice fica por conta do banco.
        return [.. regioes.OrderBy(r => r.Nome, StringComparer.Ordinal)];
    }

    /// <summary>
    /// Conta comum basta: a rota é [Authorize] sem role. E-mail único por execução para
    /// não colidir com outros testes que dividem a mesma fixture.
    /// </summary>
    private async Task<string> TokenUsuarioComumAsync()
    {
        var resposta = await _client.PostAsJsonAsync("/api/auth/cadastro",
            new CadastroRequestDto
            {
                Nome = "Teste",
                Email = $"previsao_{Guid.NewGuid()}@test.com",
                Senha = "Senha@123",
            });
        resposta.EnsureSuccessStatusCode();

        var sessao = await resposta.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts);
        sessao.Should().NotBeNull();
        sessao!.Token.Should().NotBeNullOrWhiteSpace("sem token não dá para provar nada de autorização");
        return sessao.Token;
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
