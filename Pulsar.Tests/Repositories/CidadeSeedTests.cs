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

        var sp = await ctx.Cidades.SingleAsync(c => c.CodigoIbge == "3550308");
        sp.Nome.Should().Be("São Paulo");
        sp.Uf.Should().Be("SP");

        // As 5 zonas da capital apontam para ela; a 6ª região é a da Baixada (BaixadaSeedTests).
        var regioes = await ctx.Regioes.Where(r => r.CidadeId == sp.Id).ToListAsync();
        regioes.Select(r => r.Nome).Should().BeEquivalentTo("Centro", "Leste", "Norte", "Oeste", "Sul");
    }
}
