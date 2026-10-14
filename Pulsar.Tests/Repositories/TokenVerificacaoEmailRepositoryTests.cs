using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

public class TokenVerificacaoEmailRepositoryTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    [Fact]
    public async Task Invalidar_E_Contar_RespeitamUsuarioEJanela()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var usuario = new Usuario { Nome = "Ana", Email = "ana@x.com", SenhaHash = "h" };
        ctx.Usuarios.Add(usuario);
        await ctx.SaveChangesAsync();
        var repo = new TokenVerificacaoEmailRepository(ctx);

        await repo.AdicionarAsync(new TokenVerificacaoEmail { UsuarioId = usuario.Id, TokenHash = "A", Email = "ana@x.com", ExpiraEm = DateTime.UtcNow.AddHours(48) });
        await repo.AdicionarAsync(new TokenVerificacaoEmail { UsuarioId = usuario.Id, TokenHash = "B", Email = "ana@x.com", ExpiraEm = DateTime.UtcNow.AddHours(48) });
        await repo.SalvarAsync();

        (await repo.ContarCriadosDesdeAsync(usuario.Id, DateTime.UtcNow.AddHours(-1))).Should().Be(2);

        await repo.InvalidarPendentesDoUsuarioAsync(usuario.Id);
        await repo.SalvarAsync();

        var a = await repo.ObterPorTokenHashAsync("A");
        a!.UsadoEm.Should().NotBeNull();
        a.Usuario.Email.Should().Be("ana@x.com"); // Include do usuário
    }
}
