using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

public class PrevisaoRepositoryTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static PontoPrevisaoDto Ponto(DateTime instanteUtc, double chuva = 0, double pop = 0)
        => new()
        {
            InstantePrevisto = instanteUtc,
            ChuvaMm = chuva,
            ProbabilidadeChuva = pop,
            VentoKmH = 12,
            RajadaKmH = 20,
            TemperaturaC = 21,
            CondicaoCodigo = 500,
            CondicaoDescricao = "chuva leve",
        };

    [Fact]
    public async Task UpsertLote_MesmaFaixaDuasVezes_NaoDuplica()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();
        var repo = new PrevisaoRepository(ctx);
        var faixa = new DateTime(2026, 8, 17, 18, 0, 0, DateTimeKind.Utc);

        await repo.UpsertLoteAsync(subId, [Ponto(faixa, chuva: 4)], DateTime.UtcNow);
        await repo.UpsertLoteAsync(subId, [Ponto(faixa, chuva: 14)], DateTime.UtcNow);

        var linhas = await ctx.PrevisoesClimaticas.Where(p => p.SubprefeituraId == subId).ToListAsync();
        linhas.Should().HaveCount(1);
        linhas[0].ChuvaMm.Should().Be(14, "o upsert sobrescreve com a previsão mais recente");
    }

    [Fact]
    public async Task UpsertLote_InstanteRepetidoNoMesmoLote_GravaSoAUltimaOcorrencia()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();
        var repo = new PrevisaoRepository(ctx);
        var faixa = new DateTime(2026, 8, 17, 18, 0, 0, DateTimeKind.Utc);

        // Duas vezes a mesma faixa dentro de um único lote: o índice único derrubaria
        // o lote todo se o upsert tratasse as duas como inserção.
        await repo.UpsertLoteAsync(subId, [Ponto(faixa, chuva: 4), Ponto(faixa, chuva: 9)], DateTime.UtcNow);

        var linhas = await ctx.PrevisoesClimaticas.Where(p => p.SubprefeituraId == subId).ToListAsync();
        linhas.Should().HaveCount(1);
        linhas[0].ChuvaMm.Should().Be(9, "vale a última ocorrência da faixa no lote");
    }

    [Fact]
    public async Task ObterUltimaColeta_SemDado_RetornaNulo()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();

        var resultado = await new PrevisaoRepository(ctx).ObterUltimaColetaAsync(subId);

        resultado.Should().BeNull();
    }

    [Fact]
    public async Task ObterUltimaColeta_ComDado_RetornaMaiorColetadoEm()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();
        var repo = new PrevisaoRepository(ctx);
        var antigo = new DateTime(2026, 8, 17, 10, 0, 0, DateTimeKind.Utc);
        var recente = new DateTime(2026, 8, 17, 11, 0, 0, DateTimeKind.Utc);

        await repo.UpsertLoteAsync(subId, [Ponto(antigo.AddHours(3))], antigo);
        await repo.UpsertLoteAsync(subId, [Ponto(antigo.AddHours(6))], recente);

        (await repo.ObterUltimaColetaAsync(subId)).Should().Be(recente);
    }

    [Fact]
    public async Task RemoverAntigas_ApagaSoOPassadoDaSubprefeitura()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var sub = await ctx.Subprefeituras.FirstAsync();
        // Uma vizinha de outra região com o mesmo passado: é ela que prova que a limpeza
        // é por subprefeitura. Sem ela o teste passa até com o filtro de subprefeitura fora.
        var vizinha = await ctx.Subprefeituras.FirstAsync(s => s.RegiaoId != sub.RegiaoId);
        var repo = new PrevisaoRepository(ctx);
        var agora = new DateTime(2026, 8, 17, 12, 0, 0, DateTimeKind.Utc);

        await repo.UpsertLoteAsync(sub.Id, [
            Ponto(agora.AddHours(-9)),
            Ponto(agora.AddHours(-6)),
            Ponto(agora.AddHours(3)),
        ], agora);
        await repo.UpsertLoteAsync(vizinha.Id, [
            Ponto(agora.AddHours(-9)),
            Ponto(agora.AddHours(-6)),
        ], agora);

        var removidas = await repo.RemoverAntigasAsync(sub.Id, agora.AddHours(-3));

        removidas.Should().Be(2);
        (await ctx.PrevisoesClimaticas.CountAsync(p => p.SubprefeituraId == sub.Id)).Should().Be(1);
        (await ctx.PrevisoesClimaticas.CountAsync(p => p.SubprefeituraId == vizinha.Id))
            .Should().Be(2, "o passado da vizinha não é assunto desta limpeza");
    }

    [Fact]
    public async Task ObterFuturasPorRegiao_TrazSubsDaRegiaoEIgnoraPassado()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var repo = new PrevisaoRepository(ctx);
        var agora = new DateTime(2026, 8, 17, 12, 0, 0, DateTimeKind.Utc);

        // Duas subprefeituras da mesma região para provar o "traz as subs da região", e uma
        // de outra região com previsão futura para provar que o filtro de região existe:
        // sem essa terceira, a consulta passaria igual trazendo a cidade inteira.
        var idRegiao = await ctx.Subprefeituras
            .GroupBy(s => s.RegiaoId).Where(g => g.Count() >= 2).Select(g => g.Key).FirstAsync();
        var daRegiao = await ctx.Subprefeituras
            .Where(s => s.RegiaoId == idRegiao).OrderBy(s => s.Nome).Take(2).ToListAsync();
        var deFora = await ctx.Subprefeituras.FirstAsync(s => s.RegiaoId != idRegiao);

        await repo.UpsertLoteAsync(daRegiao[0].Id, [Ponto(agora.AddHours(-3)), Ponto(agora.AddHours(3))], agora);
        await repo.UpsertLoteAsync(daRegiao[1].Id, [Ponto(agora.AddHours(6))], agora);
        await repo.UpsertLoteAsync(deFora.Id, [Ponto(agora.AddHours(3))], agora);

        var futuras = await repo.ObterFuturasPorRegiaoAsync(idRegiao, agora);

        futuras.Should().HaveCount(2);
        futuras.Select(p => p.SubprefeituraId)
            .Should().BeEquivalentTo([daRegiao[0].Id, daRegiao[1].Id], "só as subs da região pedida");
        futuras.Select(p => p.InstantePrevisto)
            .Should().Equal(agora.AddHours(3), agora.AddHours(6));
    }
}
