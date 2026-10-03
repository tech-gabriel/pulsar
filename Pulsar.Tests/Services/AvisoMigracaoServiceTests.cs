using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class AvisoMigracaoServiceTests
{
    private readonly Mock<IPushNotificationService> _push = new();
    private readonly Mock<IEmailSender> _email = new();

    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static async Task<Usuario> PessoaComZonasAsync(PulsarDbContext ctx, params string[] zonas)
    {
        var u = new Usuario { Nome = "Ana", Email = $"{Guid.NewGuid()}@t.dev", SenhaHash = "x" };
        ctx.Usuarios.Add(u);
        foreach (var z in zonas)
            ctx.MigracoesFavoritoZona.Add(new MigracaoFavoritoZona
            {
                UsuarioId = u.Id,
                RegiaoId = (await ctx.Regioes.FirstAsync(r => r.Nome == z)).Id,
            });
        await ctx.SaveChangesAsync();
        return u;
    }

    private AvisoMigracaoService Criar(PulsarDbContext ctx)
        => new(ctx, _push.Object, _email.Object, NullLogger<AvisoMigracaoService>.Instance);

    [Fact]
    public async Task DuasZonas_UmPushEUmEmailCitandoAsDuas()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var u = await PessoaComZonasAsync(ctx, "Leste", "Sul");

        await Criar(ctx).ProcessarPendentesAsync();

        _push.Verify(p => p.NotificarUsuarioAsync(u.Id, CriterioOptIn.RiscoAlto,
            It.Is<PushPayload>(x => x.Corpo.Contains("as zonas Leste e Sul")), It.IsAny<CancellationToken>()), Times.Once);
        _email.Verify(e => e.EnviarAsync(u.Email, It.IsAny<string>(),
            It.Is<string>(h => h.Contains("as zonas Leste e Sul")), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SegundaRodada_NaoRepete()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComZonasAsync(ctx, "Leste");
        var sut = Criar(ctx);

        await sut.ProcessarPendentesAsync();
        await sut.ProcessarPendentesAsync();

        _push.Verify(p => p.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Once);
        _email.Verify(e => e.EnviarAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task EmailFalha_PushMarcado_EmailTentaDeNovo()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComZonasAsync(ctx, "Leste");
        _email.SetupSequence(e => e.EnviarAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ThrowsAsync(new InvalidOperationException("Resend fora"))
              .Returns(Task.CompletedTask);
        var sut = Criar(ctx);

        await sut.ProcessarPendentesAsync();
        await sut.ProcessarPendentesAsync();

        _push.Verify(p => p.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Once);
        _email.Verify(e => e.EnviarAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
        (await ctx.MigracoesFavoritoZona.AllAsync(m => m.EmailAvisadoEm != null)).Should().BeTrue();
    }
}
