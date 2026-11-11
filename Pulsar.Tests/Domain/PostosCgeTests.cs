using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Chuva;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;

namespace Pulsar.Tests.Domain;

public class PostosCgeTests
{
    [Fact]
    public async Task Todos_PostosDaCapital_CasamComUmaSubprefeituraDoSeed()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options);
        ctx.Database.EnsureCreated();
        var subs = await ctx.Subprefeituras.ToListAsync();

        foreach (var p in PostosCge.Todos.Where(p => p.Subprefeitura is not null))
            AlagamentoCgeService.Casar(p.Subprefeitura!, subs).Should().NotBeNull($"posto {p.Id} ({p.Nome})");

        PostosCge.Todos.Should().HaveCount(32);
        PostosCge.Todos.Count(p => p.Subprefeitura is null).Should().Be(3);
        PostosCge.Todos.Select(p => p.Id).Should().OnlyHaveUniqueItems();
    }
}
