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

        var novaData = data.AddDays(1);
        var atualizada = Nova("1", novaData);
        atualizada.Latitude = -23.7;
        atualizada.Longitude = -46.7;
        atualizada.NmSubprefeitura = "SÉ";
        atualizada.FonteOriginal = "OUTRA-FONTE";
        atualizada.DataCarga = novaData.AddHours(1);
        await repo.UpsertRangeAsync([atualizada]);

        var lida = await ctx.OcorrenciasAlagamento.SingleAsync();
        lida.DataOcorrencia.Should().Be(novaData);
        lida.Latitude.Should().Be(-23.7);
        lida.Longitude.Should().Be(-46.7);
        lida.NmSubprefeitura.Should().Be("SÉ");
        lida.FonteOriginal.Should().Be("OUTRA-FONTE");
        lida.DataCarga.Should().Be(novaData.AddHours(1));
    }

    [Fact]
    public async Task UpsertRange_LoteComChaveDuplicada_NaoEstoura()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var repo = new OcorrenciaAlagamentoRepository(ctx);
        var data = DateTime.UtcNow.AddMonths(-1);

        var primeira = Nova("dup", data);
        primeira.NmSubprefeitura = "VP";
        var segunda = Nova("dup", data);
        segunda.NmSubprefeitura = "SÉ";

        var act = () => repo.UpsertRangeAsync([primeira, segunda]);

        await act.Should().NotThrowAsync();
        (await ctx.OcorrenciasAlagamento.CountAsync()).Should().Be(1);
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
