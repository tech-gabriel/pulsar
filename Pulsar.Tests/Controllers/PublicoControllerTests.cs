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

/// <summary>
/// Risco agora público (página "Pontos de alagamento em SP hoje"). Classe com factory própria:
/// o cache é singleton do container e vazaria a resposta para outros testes.
/// </summary>
public class PublicoControllerTests : IClassFixture<PulsarWebApplicationFactory>
{
    private const string Rota = "/api/publico/risco-agora";
    private readonly PulsarWebApplicationFactory _factory;

    public PublicoControllerTests(PulsarWebApplicationFactory factory) => _factory = factory;

    private static readonly string[] FaixasValidas = ["BAIXO", "MODERADO", "ALTO"];

    [Fact]
    public async Task RiscoAgora_SemLogin_Responde200ComAsSubprefeiturasAtivas_EIncluiPontosCgeAtivos()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            var subMooca = await db.Subprefeituras.FirstAsync(s => s.Nome == "Mooca");
            var agora = DateTime.UtcNow;
            db.PontosAlagamentoCge.Add(new PontoAlagamentoCge
            {
                SubprefeituraId = subMooca.Id, Dia = DateOnly.FromDateTime(agora), Via = "RUA DA MOOCA",
                Referencia = "ALTURA DO 1000", InicioUtc = agora.AddMinutes(-20), Ativo = true, VistoEm = agora, CriadoEm = agora,
            });
            db.PontosAlagamentoCge.Add(new PontoAlagamentoCge
            {
                SubprefeituraId = subMooca.Id, Dia = DateOnly.FromDateTime(agora), Via = "RUA VELHA",
                Referencia = "PONTO VENCIDO", InicioUtc = agora.AddDays(-3), Ativo = true, VistoEm = agora.AddDays(-3), CriadoEm = agora.AddDays(-3),
            });
            await db.SaveChangesAsync();
        }

        var resposta = await _factory.CreateClient().GetAsync(Rota);

        resposta.StatusCode.Should().Be(HttpStatusCode.OK);
        using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
        var itens = json.RootElement.EnumerateArray().ToList();
        itens.Should().NotBeEmpty();
        itens.Select(i => i.GetProperty("faixaRisco").GetString()).Should().OnlyContain(f => FaixasValidas.Contains(f));
        var nomes = itens.Select(i => i.GetProperty("nome").GetString()).ToList();
        nomes.Should().BeInAscendingOrder(StringComparer.Ordinal);
        // Campos da frase do risco (a mesma do detalhe do app): presentes em todo item.
        string[] camposFrase = ["perigoPrincipal", "chuva3hMm", "ventoKmH", "sensacaoTermica"];
        foreach (var item in itens)
            camposFrase.Should().OnlyContain(c => item.EnumerateObject().Any(p => p.Name == c));

        var mooca = itens.Single(i => i.GetProperty("nome").GetString() == "Mooca");
        var vias = mooca.GetProperty("alagamentosCge").EnumerateArray().Select(p => p.GetProperty("via").GetString()).ToList();
        vias.Should().Equal("Rua Da Mooca");
        itens.Where(i => i.GetProperty("nome").GetString() != "Mooca")
            .Should().OnlyContain(i => i.GetProperty("alagamentosCge").GetArrayLength() == 0);
    }
}
