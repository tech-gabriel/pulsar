using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

public class NotificacaoEnviadaRepositoryTests
{
    private static readonly Guid Mooca = Guid.Parse("20000000-0000-0000-0000-000000000008");

    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static async Task<Guid> NovoUsuarioAsync(PulsarDbContext ctx)
    {
        var u = new Usuario { Nome = "T", Email = $"{Guid.NewGuid()}@t.dev", SenhaHash = "x" };
        ctx.Usuarios.Add(u);
        await ctx.SaveChangesAsync();
        return u.Id;
    }

    private static NotificacaoEnviada Registro(Guid usuarioId, string chave, DateTime enviadoEm, Guid? envioId = null)
        => new()
        {
            UsuarioId = usuarioId,
            SubprefeituraId = Mooca,
            Gatilho = "score-alto",
            Chave = chave,
            EnviadoEm = enviadoEm,
            EnvioId = envioId ?? Guid.NewGuid(),
        };

    [Fact]
    public async Task ObterRecentes_FiltraPorPessoaEJanela()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var repo = new NotificacaoEnviadaRepository(ctx);
        var a = await NovoUsuarioAsync(ctx);
        var b = await NovoUsuarioAsync(ctx);
        await repo.RegistrarAsync([
            Registro(a, "k1", DateTime.UtcNow.AddHours(-1)),
            Registro(a, "k2", DateTime.UtcNow.AddHours(-50)),
            Registro(b, "k3", DateTime.UtcNow)]);

        var recentes = await repo.ObterRecentesAsync([a], 48);

        recentes.Should().ContainSingle().Which.Chave.Should().Be("k1");
    }

    [Fact]
    public async Task MesmaChave_PessoasDiferentes_Convivem()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var repo = new NotificacaoEnviadaRepository(ctx);
        var a = await NovoUsuarioAsync(ctx);
        var b = await NovoUsuarioAsync(ctx);

        await repo.RegistrarAsync([Registro(a, "k", DateTime.UtcNow), Registro(b, "k", DateTime.UtcNow)]);

        (await ctx.NotificacoesEnviadas.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task MesmaChave_MesmaPessoa_Explode_ENaoContaminaOProximo()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var repo = new NotificacaoEnviadaRepository(ctx);
        var a = await NovoUsuarioAsync(ctx);
        await repo.RegistrarAsync([Registro(a, "k", DateTime.UtcNow)]);

        var act = () => repo.RegistrarAsync([Registro(a, "k", DateTime.UtcNow)]);
        await act.Should().ThrowAsync<DbUpdateException>();

        await repo.RegistrarAsync([Registro(a, "outra", DateTime.UtcNow)]);
        (await ctx.NotificacoesEnviadas.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task RemoverAntigas_ApagaAcimaDoLimite()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var repo = new NotificacaoEnviadaRepository(ctx);
        var a = await NovoUsuarioAsync(ctx);
        await repo.RegistrarAsync([
            Registro(a, "velha", DateTime.UtcNow.AddDays(-40)),
            Registro(a, "nova", DateTime.UtcNow)]);

        (await repo.RemoverAntigasAsync(DateTime.UtcNow.AddDays(-30))).Should().Be(1);
    }
}
