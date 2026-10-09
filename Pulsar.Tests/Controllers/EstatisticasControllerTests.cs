using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>Contrato de <c>GET /api/estatisticas/regioes</c>, lido pelo build do site (sem login).</summary>
public class EstatisticasControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly PulsarWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public EstatisticasControllerTests(PulsarWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Regioes_SemToken_Retorna200ComTodasAsPaginas()
    {
        var hoje = FusoLocal.DiaLocal(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo"));
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            var mooca = await db.Subprefeituras.FirstAsync(s => s.Nome == "Mooca");
            db.AgregadosDiarios.Add(new AgregadoDiario
            {
                SubprefeituraId = mooca.Id, Dia = hoje, FusoHorario = "America/Sao_Paulo",
                ChuvaTotalMm = 12.34, LeiturasCount = 96, LeiturasBaixo = 90, LeiturasAlto = 6,
            });
            await db.SaveChangesAsync();
        }

        var resp = await _client.GetAsync("/api/estatisticas/regioes");

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var raiz = json.RootElement;
        raiz.GetProperty("janelaDias").GetInt32().Should().Be(90);
        raiz.GetProperty("geradoEm").GetString().Should().Be(hoje.ToString("yyyy-MM-dd"));

        var subs = raiz.GetProperty("subprefeituras");
        subs.EnumerateObject().Should().HaveCount(32);
        var m = subs.GetProperty("mooca");
        m.GetProperty("diasCompletos").GetInt32().Should().Be(1);
        m.GetProperty("diasAlerta").GetInt32().Should().Be(1);
        m.GetProperty("chuvaTotalMm").GetDouble().Should().Be(12.3);
        m.GetProperty("faixaPredominante").GetString().Should().Be("BAIXO");
        m.GetProperty("diaMaisChuvoso").GetProperty("mm").GetDouble().Should().Be(12.3);
        subs.GetProperty("penha").ValueKind.Should().Be(JsonValueKind.Null);

        var zonas = raiz.GetProperty("zonas");
        zonas.EnumerateObject().Select(p => p.Name).Should()
            .BeEquivalentTo(["zona-centro", "zona-leste", "zona-norte", "zona-oeste", "zona-sul"]);
    }
}
