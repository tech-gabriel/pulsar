using System.Net;
using System.Reflection;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Controllers;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>Proteções e contrato do endpoint público. Factory própria (cache singleton).</summary>
public class PublicoProtecaoTests : IClassFixture<PulsarWebApplicationFactory>
{
    private const string Rota = "/api/publico/risco-agora";
    private readonly PulsarWebApplicationFactory _factory;

    public PublicoProtecaoTests(PulsarWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task RiscoAgora_NaoExpoeDadoDeUsuario()
    {
        var corpo = await _factory.CreateClient().GetStringAsync(Rota);

        corpo.Should().NotContainAny("\"id\"", "email", "usuario", "subprefeituraId");
    }

    [Fact]
    public async Task RiscoAgora_SegundaChamada_VemDoCache_SemConsultarOBanco()
    {
        var client = _factory.CreateClient();
        var primeira = await client.GetStringAsync(Rota);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            var penha = await db.Subprefeituras.FirstAsync(s => s.Nome == "Penha");
            var agora = DateTime.UtcNow;
            db.PontosAlagamentoCge.Add(new PontoAlagamentoCge
            {
                SubprefeituraId = penha.Id, Dia = DateOnly.FromDateTime(agora), Via = "RUA NOVA DEPOIS DO CACHE",
                Referencia = "X", InicioUtc = agora, Ativo = true, VistoEm = agora, CriadoEm = agora,
            });
            await db.SaveChangesAsync();
        }

        var segunda = await client.GetStringAsync(Rota);

        segunda.Should().Be(primeira);
    }

    [Fact]
    public void RiscoAgora_TemRateLimitProprio()
    {
        var metodo = typeof(PublicoController).GetMethod(nameof(PublicoController.RiscoAgora))!;

        metodo.GetCustomAttribute<EnableRateLimitingAttribute>()!.PolicyName.Should().Be("publico");
    }
}
