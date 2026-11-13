using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

public class CidadeSeedTests
{
    [Fact]
    public async Task Seed_TemSaoPauloETodasAsRegioesApontamParaEla()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options);
        ctx.Database.EnsureCreated();

        var cidades = await ctx.Cidades.ToListAsync();
        cidades.Should().ContainSingle();
        cidades[0].Nome.Should().Be("São Paulo");
        cidades[0].Uf.Should().Be("SP");
        cidades[0].CodigoIbge.Should().Be("3550308");

        var regioes = await ctx.Regioes.ToListAsync();
        regioes.Should().HaveCount(5);
        regioes.Should().OnlyContain(r => r.CidadeId == cidades[0].Id);
    }
}
