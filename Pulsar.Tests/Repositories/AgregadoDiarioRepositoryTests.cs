using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

public class AgregadoDiarioRepositoryTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    [Fact]
    public async Task Regioes_SemeadasComFusoDeSaoPaulo()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        var regioes = await ctx.Regioes.ToListAsync();

        regioes.Should().HaveCount(5);
        regioes.Should().OnlyContain(r => r.FusoHorario == "America/Sao_Paulo");
    }
}
