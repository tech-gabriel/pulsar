using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class AgregadoDiarioServiceTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static AgregadoDiarioService NovoServico(PulsarDbContext ctx)
        => new(
            new SubprefeituraRepository(ctx),
            new LeituraRepository(ctx),
            new ScoreRepository(ctx),
            new AgregadoDiarioRepository(ctx),
            NullLogger<AgregadoDiarioService>.Instance);

    /// <summary>Grava uma leitura + score no instante UTC pedido.</summary>
    private static async Task GravarLeituraAsync(
        PulsarDbContext ctx, Guid subId, DateTime instanteUtc,
        double chuvaMmH, double valorScore, FaixaRisco faixa,
        double vento = 10, double temp = 20, double uv = 3)
    {
        var leitura = new LeituraClimatica
        {
            SubprefeituraId = subId, Timestamp = instanteUtc,
            ChuvaMmH = chuvaMmH, VentoKmH = vento, VisibilidadeKm = 10,
            IndiceUv = uv, TemperaturaC = temp, SensacaoTermica = temp, Umidade = 60,
        };
        ctx.LeiturasClimaticas.Add(leitura);
        ctx.ScoresPerigo.Add(new ScorePerigo
        {
            SubprefeituraId = subId, LeituraId = leitura.Id,
            Timestamp = instanteUtc, Valor = valorScore, Faixa = faixa,
        });
        await ctx.SaveChangesAsync();
    }

    [Fact]
    public async Task Soma_ChuvaExtremosEContagensDoDia()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();

        // Hoje em SP, três leituras dentro do mesmo dia local.
        var hojeLocal = DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo")));
        var meioDiaUtc = DateTime.SpecifyKind(hojeLocal.ToDateTime(new TimeOnly(15, 0)), DateTimeKind.Utc); // 12h em SP

        await GravarLeituraAsync(ctx, subId, meioDiaUtc,               chuvaMmH: 4, valorScore: 20, FaixaRisco.BAIXO,    vento: 10, temp: 18, uv: 2);
        await GravarLeituraAsync(ctx, subId, meioDiaUtc.AddMinutes(15), chuvaMmH: 8, valorScore: 70, FaixaRisco.ALTO,     vento: 55, temp: 25, uv: 9);
        await GravarLeituraAsync(ctx, subId, meioDiaUtc.AddMinutes(30), chuvaMmH: 0, valorScore: 45, FaixaRisco.MODERADO, vento: 20, temp: 22, uv: 5);

        await NovoServico(ctx).AtualizarRecentesAsync(subId, default);

        var linha = await ctx.AgregadosDiarios.SingleAsync(a => a.Dia == hojeLocal);
        linha.ChuvaTotalMm.Should().BeApproximately(3.0, 0.001); // (4 + 8 + 0) * 0.25
        linha.LeiturasCount.Should().Be(3);
        linha.LeiturasBaixo.Should().Be(1);
        linha.LeiturasModerado.Should().Be(1);
        linha.LeiturasAlto.Should().Be(1);
        linha.ScoreMin.Should().Be(20);
        linha.ScoreMax.Should().Be(70);
        linha.ScoreMedio.Should().BeApproximately(45.0, 0.001);
        linha.VentoMaxKmH.Should().Be(55);
        linha.TemperaturaMinC.Should().Be(18);
        linha.TemperaturaMaxC.Should().Be(25);
        linha.UvMax.Should().Be(9);
        linha.FusoHorario.Should().Be("America/Sao_Paulo");
    }

    [Fact]
    public async Task LeituraDaNoite_CaiNoDiaLocalENaoNoDiaUtcSeguinte()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();
        var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

        // 23h de ontem em SP = 02h de HOJE em UTC. Somando por dia UTC, cairia no dia errado.
        var ontemLocal = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz)).AddDays(-1);
        var instanteUtc = DateTime.SpecifyKind(ontemLocal.AddDays(1).ToDateTime(new TimeOnly(2, 0)), DateTimeKind.Utc);

        await GravarLeituraAsync(ctx, subId, instanteUtc, chuvaMmH: 12, valorScore: 80, FaixaRisco.ALTO);

        await NovoServico(ctx).AtualizarRecentesAsync(subId, default);

        var linha = await ctx.AgregadosDiarios.SingleAsync();
        linha.Dia.Should().Be(ontemLocal);
        linha.LeiturasAlto.Should().Be(1);
    }

    [Fact]
    public async Task RegioesComFusosDiferentes_BucketizamAMesmaLeituraEmDiasDiferentes()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        // Uma subprefeitura em SP (UTC-3) e outra numa região movida para Manaus (UTC-4).
        var subSp = await ctx.Subprefeituras.Include(s => s.Regiao).FirstAsync();
        var subManaus = await ctx.Subprefeituras.Include(s => s.Regiao)
            .FirstAsync(s => s.RegiaoId != subSp.RegiaoId);
        subManaus.Regiao.FusoHorario = "America/Manaus";
        await ctx.SaveChangesAsync();

        // 03:30 UTC: já é dia D em SP (00:30) e ainda é dia D-1 em Manaus (23:30).
        var hojeSp = DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo")));
        var instanteUtc = DateTime.SpecifyKind(hojeSp.ToDateTime(new TimeOnly(3, 30)), DateTimeKind.Utc);

        await GravarLeituraAsync(ctx, subSp.Id, instanteUtc, chuvaMmH: 4, valorScore: 10, FaixaRisco.BAIXO);
        await GravarLeituraAsync(ctx, subManaus.Id, instanteUtc, chuvaMmH: 4, valorScore: 10, FaixaRisco.BAIXO);

        var servico = NovoServico(ctx);
        await servico.AtualizarRecentesAsync(subSp.Id, default);
        await servico.AtualizarRecentesAsync(subManaus.Id, default);

        var linhaSp = await ctx.AgregadosDiarios.SingleAsync(a => a.SubprefeituraId == subSp.Id);
        var linhaManaus = await ctx.AgregadosDiarios.SingleAsync(a => a.SubprefeituraId == subManaus.Id);

        linhaSp.Dia.Should().Be(hojeSp);
        linhaManaus.Dia.Should().Be(hojeSp.AddDays(-1));
        linhaManaus.FusoHorario.Should().Be("America/Manaus");
    }

    [Fact]
    public async Task NaoGravaDiaMaisAntigoQueOntem()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();

        // 54h atrás: dentro da janela de 72h, mas sempre anterior a ontem em qualquer
        // horário do dia. O dia está incompleto, então gravá-lo escreveria um total
        // menor que o real. Não usar AddDays(-3): daria exatamente 72h, a leitura
        // cairia fora da retenção e o teste passaria sem testar esta regra.
        await GravarLeituraAsync(ctx, subId, DateTime.UtcNow.AddHours(-54), chuvaMmH: 20, valorScore: 90, FaixaRisco.ALTO);

        await NovoServico(ctx).AtualizarRecentesAsync(subId, default);

        ctx.AgregadosDiarios.Should().BeEmpty();
    }

    [Fact]
    public async Task RecalculoDeOntem_CorrigeLinhaParcial()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subId = await ctx.Subprefeituras.Select(s => s.Id).FirstAsync();
        var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        var ontemLocal = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz)).AddDays(-1);

        // 15h locais de ontem = 18h UTC. Dentro de 72h em qualquer ponto do dia.
        var tardeUtc = DateTime.SpecifyKind(ontemLocal.ToDateTime(new TimeOnly(18, 0)), DateTimeKind.Utc);

        var servico = NovoServico(ctx);

        // Primeiro ciclo: o dia de ontem tem só uma leitura.
        await GravarLeituraAsync(ctx, subId, tardeUtc, chuvaMmH: 4, valorScore: 20, FaixaRisco.BAIXO);
        await servico.AtualizarRecentesAsync(subId, default);

        var parcial = await ctx.AgregadosDiarios.SingleAsync(a => a.Dia == ontemLocal);
        parcial.LeiturasCount.Should().Be(1);

        // Chega a leitura que faltava do mesmo dia. O ciclo seguinte tem que corrigir
        // a linha, e não deixá-la congelada no estado parcial nem criar uma segunda.
        await GravarLeituraAsync(ctx, subId, tardeUtc.AddMinutes(15), chuvaMmH: 8, valorScore: 70, FaixaRisco.ALTO);
        await servico.AtualizarRecentesAsync(subId, default);

        var linhas = await ctx.AgregadosDiarios.Where(a => a.Dia == ontemLocal).ToListAsync();
        linhas.Should().HaveCount(1);
        linhas[0].LeiturasCount.Should().Be(2);
        linhas[0].ChuvaTotalMm.Should().BeApproximately(3.0, 0.001); // (4 + 8) * 0.25
        linhas[0].LeiturasAlto.Should().Be(1);
    }
}
