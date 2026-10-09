using System.Reflection;
using FluentAssertions;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Controllers;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>
/// Proteções do endpoint público contra chamada em loop. Classe própria: o cache é
/// singleton do container, e dividir a factory com outros testes vazaria a resposta cacheada.
/// </summary>
public class EstatisticasProtecaoTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly PulsarWebApplicationFactory _factory;

    public EstatisticasProtecaoTests(PulsarWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Regioes_SegundaChamada_VemDoCache_SemConsultarOBanco()
    {
        var client = _factory.CreateClient();
        var primeira = await client.GetStringAsync("/api/estatisticas/regioes");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            var penha = await db.Subprefeituras.FirstAsync(s => s.Nome == "Penha");
            db.AgregadosDiarios.Add(new AgregadoDiario
            {
                SubprefeituraId = penha.Id,
                Dia = FusoLocal.DiaLocal(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo")),
                FusoHorario = "America/Sao_Paulo", ChuvaTotalMm = 50, LeiturasCount = 96, LeiturasBaixo = 96,
            });
            await db.SaveChangesAsync();
        }

        var segunda = await client.GetStringAsync("/api/estatisticas/regioes");

        segunda.Should().Be(primeira);
    }

    [Fact]
    public void Regioes_TemRateLimitProprio()
    {
        var metodo = typeof(EstatisticasController).GetMethod(nameof(EstatisticasController.Regioes))!;

        metodo.GetCustomAttribute<EnableRateLimitingAttribute>()!.PolicyName.Should().Be("estatisticas");
    }
}
