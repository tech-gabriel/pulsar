using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
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

    [Fact]
    public async Task IndiceUnico_ImpedeDuasLinhasNoMesmoDiaParaAMesmaSubprefeitura()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();
        var dia = new DateOnly(2026, 8, 13);

        ctx.AgregadosDiarios.Add(new AgregadoDiario { SubprefeituraId = subId, Dia = dia, FusoHorario = "America/Sao_Paulo" });
        await ctx.SaveChangesAsync();

        ctx.AgregadosDiarios.Add(new AgregadoDiario { SubprefeituraId = subId, Dia = dia, FusoHorario = "America/Sao_Paulo" });
        var acao = async () => await ctx.SaveChangesAsync();

        await acao.Should().ThrowAsync<DbUpdateException>();
    }
}
