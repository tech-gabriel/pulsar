using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

public class NotificacaoEnviadaRepositoryTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static NotificacaoEnviada Registro(
        Guid regiaoId, string gatilho, string chave, DateTime enviadoEm)
        => new()
        {
            RegiaoId = regiaoId,
            Gatilho = gatilho,
            Chave = chave,
            EnviadoEm = enviadoEm,
            Destinatarios = 3,
        };

    [Fact]
    public async Task ExisteChave_ChaveGravada_RetornaTrue()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await ctx.Regioes.Select(r => r.Id).FirstAsync();
        var repo = new NotificacaoEnviadaRepository(ctx);

        await repo.RegistrarAsync(Registro(regiaoId, "chuva-prevista", "chuva:x:18h", DateTime.UtcNow));

        (await repo.ExisteChaveAsync("chuva:x:18h")).Should().BeTrue();
        (await repo.ExisteChaveAsync("chuva:x:21h")).Should().BeFalse();
    }

    [Fact]
    public async Task ExisteDesde_EnvioDentroDaJanela_RetornaTrue()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await ctx.Regioes.Select(r => r.Id).FirstAsync();
        var repo = new NotificacaoEnviadaRepository(ctx);
        var agora = DateTime.UtcNow;

        await repo.RegistrarAsync(Registro(regiaoId, "score-alto", "score:a", agora.AddMinutes(-30)));

        (await repo.ExisteDesdeAsync(regiaoId, "score-alto", agora.AddHours(-1))).Should().BeTrue();
    }

    [Fact]
    public async Task ExisteDesde_EnvioForaDaJanela_RetornaFalse()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await ctx.Regioes.Select(r => r.Id).FirstAsync();
        var repo = new NotificacaoEnviadaRepository(ctx);
        var agora = DateTime.UtcNow;

        await repo.RegistrarAsync(Registro(regiaoId, "score-alto", "score:a", agora.AddMinutes(-90)));

        (await repo.ExisteDesdeAsync(regiaoId, "score-alto", agora.AddHours(-1))).Should().BeFalse();
    }

    [Fact]
    public async Task ExisteDesde_GatilhoDiferente_NaoInterfere()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await ctx.Regioes.Select(r => r.Id).FirstAsync();
        var repo = new NotificacaoEnviadaRepository(ctx);
        var agora = DateTime.UtcNow;

        // O único envio da região está dentro da janela e é de outro gatilho: se o filtro
        // de gatilho sumisse, a consulta acharia esta linha e o cooldown do score-alto
        // seria silenciado por um briefing.
        await repo.RegistrarAsync(Registro(regiaoId, "briefing-diario", "brief:a", agora.AddMinutes(-10)));

        (await repo.ExisteDesdeAsync(regiaoId, "score-alto", agora.AddHours(-1))).Should().BeFalse();
    }

    [Fact]
    public async Task ExisteDesde_OutraRegiao_NaoInterfere()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regioes = await ctx.Regioes.Select(r => r.Id).Take(2).ToListAsync();
        var repo = new NotificacaoEnviadaRepository(ctx);
        var agora = DateTime.UtcNow;

        // Mesmo gatilho, mesma janela, região vizinha: o cooldown é por região, então
        // um envio na vizinha não pode calar o push desta aqui.
        await repo.RegistrarAsync(Registro(regioes[1], "score-alto", "score:vizinha", agora.AddMinutes(-10)));

        (await repo.ExisteDesdeAsync(regioes[0], "score-alto", agora.AddHours(-1))).Should().BeFalse();
    }

    [Fact]
    public async Task ObterRecentesPorRegiao_FiltraPorJanelaERegiao()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regioes = await ctx.Regioes.Select(r => r.Id).Take(2).ToListAsync();
        var repo = new NotificacaoEnviadaRepository(ctx);
        var agora = DateTime.UtcNow;

        // "b" está fora da janela de 48h e "c" é de outra região: cada um derruba o teste
        // se o filtro correspondente sair da consulta.
        await repo.RegistrarAsync(Registro(regioes[0], "score-alto", "a", agora.AddHours(-2)));
        await repo.RegistrarAsync(Registro(regioes[0], "score-alto", "b", agora.AddHours(-60)));
        await repo.RegistrarAsync(Registro(regioes[1], "score-alto", "c", agora.AddHours(-2)));

        var recentes = await repo.ObterRecentesPorRegiaoAsync(regioes[0], 48);

        recentes.Should().HaveCount(1);
        recentes[0].Chave.Should().Be("a");
    }

    [Fact]
    public async Task RemoverAntigas_ApagaAcimaDoLimite()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await ctx.Regioes.Select(r => r.Id).FirstAsync();
        var repo = new NotificacaoEnviadaRepository(ctx);
        var agora = DateTime.UtcNow;

        await repo.RegistrarAsync(Registro(regiaoId, "score-alto", "velho", agora.AddDays(-40)));
        await repo.RegistrarAsync(Registro(regiaoId, "score-alto", "novo", agora.AddDays(-2)));

        var removidos = await repo.RemoverAntigasAsync(agora.AddDays(-30));

        removidos.Should().Be(1);
        (await ctx.NotificacoesEnviadas.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task RegistrarAsync_ChaveRepetida_Explode()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await ctx.Regioes.Select(r => r.Id).FirstAsync();
        var repo = new NotificacaoEnviadaRepository(ctx);
        var agora = DateTime.UtcNow;

        // O índice único da Chave é a última linha de defesa do "exatamente uma vez por
        // evento": se dois ciclos se sobrepuserem, o segundo INSERT não pode passar.
        await repo.RegistrarAsync(Registro(regiaoId, "chuva-prevista", "chuva:x:18h", agora));

        var repetir = async () =>
            await repo.RegistrarAsync(Registro(regiaoId, "chuva-prevista", "chuva:x:18h", agora));

        await repetir.Should().ThrowAsync<DbUpdateException>();
    }
}
