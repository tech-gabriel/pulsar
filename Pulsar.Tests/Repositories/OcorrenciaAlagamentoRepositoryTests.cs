using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

public class OcorrenciaAlagamentoRepositoryTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static OcorrenciaAlagamento Nova(string cd, DateTime data,
        TipoOcorrenciaAlagamento tipo = TipoOcorrenciaAlagamento.ALAGAMENTO)
        => new()
        {
            CdIdentificador = cd, Tipo = tipo, DataOcorrencia = data,
            Latitude = -23.6, Longitude = -46.5, FonteOriginal = "SIGRC",
            DataCarga = data, NmSubprefeitura = "VP",
        };

    [Fact]
    public async Task UpsertRange_DuasVezes_NaoDuplica()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var repo = new OcorrenciaAlagamentoRepository(ctx);
        var data = DateTime.UtcNow.AddMonths(-1);

        await repo.UpsertRangeAsync([Nova("1", data), Nova("2", data)]);
        await repo.UpsertRangeAsync([Nova("1", data), Nova("2", data), Nova("3", data)]);

        (await ctx.OcorrenciasAlagamento.CountAsync()).Should().Be(3);
    }

    [Fact]
    public async Task UpsertRange_AtualizaRegistroExistente()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var repo = new OcorrenciaAlagamentoRepository(ctx);
        var data = DateTime.UtcNow.AddMonths(-1);

        await repo.UpsertRangeAsync([Nova("1", data)]);
        var atualizada = Nova("1", data);
        atualizada.NmSubprefeitura = "SÉ";
        await repo.UpsertRangeAsync([atualizada]);

        var lida = await ctx.OcorrenciasAlagamento.SingleAsync();
        lida.NmSubprefeitura.Should().Be("SÉ");
    }

    [Fact]
    public async Task ObterRecentes_FiltraForaDaJanela()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var repo = new OcorrenciaAlagamentoRepository(ctx);

        await repo.UpsertRangeAsync([
            Nova("recente", DateTime.UtcNow.AddMonths(-2)),
            Nova("antiga", DateTime.UtcNow.AddMonths(-20)),
        ]);

        var recentes = await repo.ObterRecentesAsync(12);
        recentes.Should().ContainSingle(o => o.CdIdentificador == "recente");
    }
}
