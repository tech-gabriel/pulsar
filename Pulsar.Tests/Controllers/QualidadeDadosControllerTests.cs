using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>
/// Contrato de <c>GET /api/admin/qualidade</c>. Cada teste sobe um host próprio com o
/// Open-Meteo falso (e cache novo); o banco SQLite é o da fixture.
/// </summary>
public class QualidadeDadosControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly PulsarWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public QualidadeDadosControllerTests(PulsarWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task SemToken_Retorna401()
    {
        var resposta = await _factory.CreateClient().GetAsync("/api/admin/qualidade");
        resposta.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UsuarioComum_Retorna403()
    {
        var client = _factory.CreateClient();
        var cadastro = await client.PostAsJsonAsync("/api/auth/cadastro", new CadastroRequestDto
        {
            Nome = "Teste", Email = $"qualidade_{Guid.NewGuid()}@test.com", Senha = "Senha@123",
        });
        var token = (await cadastro.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!.Token;

        var resposta = await GetAsync(client, "/api/admin/qualidade", token);

        resposta.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ChuvaQueNaoAconteceu_ViraAviso_EOPeriodoFicaEntreUmETrintaDias()
    {
        var host = HostComOpenMeteo(serieDe: 0.1);
        var sub = await SemearChuvaDeHojeAsync(host, "Sé", 46);
        var client = host.CreateClient();
        var token = (await SessaoAdmin.ObterAsync(_factory, client)).Token;

        var painel = await LerAsync(client, "/api/admin/qualidade?dias=90", token);

        painel.Dias.Should().Be(30);
        painel.OpenMeteoDisponivel.Should().BeTrue();
        painel.Avisos.Should().ContainSingle(a => a.Tipo == AvaliadorQualidade.ChuvaNaoAconteceu && a.Subprefeitura == "Sé");
        var linha = painel.Subprefeituras.Single(s => s.Id == sub);
        linha.Dias.Should().HaveCount(30);
        linha.Dias[0].ChuvaPulsarMm.Should().Be(46);
        linha.Dias[0].ChuvaOpenMeteoMm.Should().BeLessThan(2.5);

        (await LerAsync(client, "/api/admin/qualidade?dias=0", token)).Dias.Should().Be(1);
    }

    [Fact]
    public async Task OpenMeteoFora_PaginaAbreSemOsAvisosQueDependemDele()
    {
        var host = HostComOpenMeteo(serieDe: null);
        await SemearChuvaDeHojeAsync(host, "Lapa", 60);
        using (var escopo = host.Services.CreateScope())
        {
            var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
            db.ExecucoesSincronizacao.Add(new ExecucaoSincronizacao
            {
                Fonte = ExecucaoSincronizacao.FonteGeoSampa, IniciadoEm = DateTime.UtcNow.AddDays(-5), Erro = "recusada",
            });
            await db.SaveChangesAsync();
        }
        var client = host.CreateClient();
        var token = (await SessaoAdmin.ObterAsync(_factory, client)).Token;

        var painel = await LerAsync(client, "/api/admin/qualidade", token);

        painel.OpenMeteoDisponivel.Should().BeFalse();
        painel.Avisos[0].Tipo.Should().Be(AvaliadorQualidade.GeoSampaParado);
        painel.GeoSampa.UltimaTentativaSucesso.Should().BeFalse();
        painel.GeoSampa.UltimoErro.Should().Be("recusada");
        painel.Avisos.Should().NotContain(a => a.Tipo == AvaliadorQualidade.ChuvaNaoAconteceu);
        painel.Subprefeituras.Should().OnlyContain(s => s.ChuvaOpenMeteoMm == null);
    }

    /// <summary>Open-Meteo falso: a mesma chuva por hora nas últimas 48 h; null = fora do ar.</summary>
    private WebApplicationFactory<Program> HostComOpenMeteo(double? serieDe)
    {
        var openMeteo = new Mock<IChuvaReferenciaClient>();
        var chamada = openMeteo.Setup(c => c.ObterHorariaPassadaAsync(
            It.IsAny<IReadOnlyList<(double, double)>>(), It.IsAny<int>(), It.IsAny<CancellationToken>()));
        if (serieDe is { } mm)
        {
            var agora = DateTime.UtcNow;
            var horaAtual = new DateTime(agora.Year, agora.Month, agora.Day, agora.Hour, 0, 0, DateTimeKind.Utc);
            IReadOnlyDictionary<DateTime, double> serie = Enumerable.Range(0, 48)
                .ToDictionary(n => horaAtual.AddHours(-n), _ => mm);
            chamada.ReturnsAsync((IReadOnlyList<(double, double)> pontos, int _, CancellationToken _) =>
                pontos.Select(_ => serie).ToList());
        }
        else
        {
            chamada.ThrowsAsync(new HttpRequestException("fora do ar"));
        }

        return _factory.WithWebHostBuilder(b => b.ConfigureTestServices(s => s.AddScoped(_ => openMeteo.Object)));
    }

    private static async Task<Guid> SemearChuvaDeHojeAsync(WebApplicationFactory<Program> host, string nome, double mm)
    {
        using var escopo = host.Services.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
        var sub = await db.Subprefeituras.Include(s => s.Regiao).SingleAsync(s => s.Nome == nome);
        var tz = TimeZoneInfo.FindSystemTimeZoneById(sub.Regiao.FusoHorario);
        db.AgregadosDiarios.Add(new AgregadoDiario
        {
            SubprefeituraId = sub.Id,
            Dia = FusoLocal.DiaLocal(DateTime.UtcNow, tz),
            FusoHorario = sub.Regiao.FusoHorario,
            ChuvaTotalMm = mm,
            LeiturasCount = 40,
        });
        await db.SaveChangesAsync();
        return sub.Id;
    }

    private static async Task<QualidadeDadosDto> LerAsync(HttpClient client, string url, string token)
    {
        var resposta = await GetAsync(client, url, token);
        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await resposta.Content.ReadFromJsonAsync<QualidadeDadosDto>(JsonOpts))!;
    }

    private static Task<HttpResponseMessage> GetAsync(HttpClient client, string url, string token)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client.SendAsync(req);
    }
}
