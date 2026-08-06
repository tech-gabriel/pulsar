using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

public class OcorrenciaAlagamentoSchemaTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>()
            .UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static OcorrenciaAlagamento Nova(string cd, TipoOcorrenciaAlagamento tipo)
        => new()
        {
            CdIdentificador = cd,
            Tipo = tipo,
            DataOcorrencia = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
            Latitude = -23.6062,
            Longitude = -46.5368,
            NmSubprefeitura = "VP - VILA PRUDENTE",
            FonteOriginal = "SIGRC",
            DataCarga = new DateTime(2026, 7, 3, 0, 0, 0, DateTimeKind.Utc),
        };

    [Fact]
    public async Task PersisteEReleOcorrencia()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        ctx.OcorrenciasAlagamento.Add(Nova("1458", TipoOcorrenciaAlagamento.ALAGAMENTO));
        await ctx.SaveChangesAsync();

        var lida = await ctx.OcorrenciasAlagamento.SingleAsync();
        lida.CdIdentificador.Should().Be("1458");
        lida.Tipo.Should().Be(TipoOcorrenciaAlagamento.ALAGAMENTO);
        lida.CriadoEm.Should().NotBe(default);
    }

    [Fact]
    public async Task IndiceUnico_ImpedeDuplicataDeCdMaisTipo()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        ctx.OcorrenciasAlagamento.Add(Nova("1458", TipoOcorrenciaAlagamento.ALAGAMENTO));
        await ctx.SaveChangesAsync();

        ctx.OcorrenciasAlagamento.Add(Nova("1458", TipoOcorrenciaAlagamento.ALAGAMENTO));
        var acao = async () => await ctx.SaveChangesAsync();
        await acao.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task MesmoCd_TiposDiferentes_SaoPermitidos()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        ctx.OcorrenciasAlagamento.Add(Nova("1458", TipoOcorrenciaAlagamento.ALAGAMENTO));
        ctx.OcorrenciasAlagamento.Add(Nova("1458", TipoOcorrenciaAlagamento.INUNDACAO));
        var acao = async () => await ctx.SaveChangesAsync();
        await acao.Should().NotThrowAsync();
    }
}
