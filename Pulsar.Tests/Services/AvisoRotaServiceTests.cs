using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;
using Pulsar.API.Services.Rota;

namespace Pulsar.Tests.Services;

public class AvisoRotaServiceTests
{
    private static readonly DateTime Agora = new(2026, 11, 3, 15, 0, 0, DateTimeKind.Utc);
    private static readonly Guid Mooca = Guid.Parse("20000000-0000-0000-0000-000000000008");
    private static readonly Guid Penha = Guid.Parse("20000000-0000-0000-0000-000000000009");

    private readonly Mock<IPushNotificationService> _push = new();
    private readonly Mock<IRotaService> _rota = new();

    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private AvisoRotaService Novo(PulsarDbContext ctx, EstadoRota estado, bool pushHabilitado = true)
    {
        _push.SetupGet(p => p.Habilitado).Returns(pushHabilitado);
        _push.Setup(p => p.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(1);
        _rota.Setup(r => r.AvaliarAsync(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new RotaAvaliacaoDto(estado, null, null, null, [], []));
        return new AvisoRotaService(ctx, _rota.Object, _push.Object, NullLogger<AvisoRotaService>.Instance);
    }

    private static SqliteConnection Abrir()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        return conn;
    }

    [Fact]
    public async Task AvaliarEDisparar_CaminhoMelhorou_MandaUmPushEApaga()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        var usuario = Guid.NewGuid();
        await svc.RegistrarAsync(usuario, [Mooca, Penha], "Penha", Agora);

        var enviados = await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        enviados.Should().Be(1);
        _push.Verify(p => p.NotificarUsuarioAsync(usuario, CriterioOptIn.RiscoAlto,
            It.Is<PushPayload>(x => x.Titulo == "O caminho até Penha melhorou" && x.Corpo == "Agora o caminho está tranquilo." && x.Url == "/app" && x.Tag == "rota"),
            It.IsAny<CancellationToken>()), Times.Once);
        (await ctx.PedidosAvisoRota.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task AvaliarEDisparar_ComAtencao_UsaACopyDeAtencao()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.ComAtencao);
        await svc.RegistrarAsync(Guid.NewGuid(), [Mooca], "Mooca", Agora);

        await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        _push.Verify(p => p.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(),
            It.Is<PushPayload>(x => x.Corpo == "Dá para ir, com atenção."), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(EstadoRota.Esperar)]
    [InlineData(EstadoRota.SemDado)]
    public async Task AvaliarEDisparar_AindaEsperar_NaoMandaEMantem(EstadoRota estado)
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, estado);
        await svc.RegistrarAsync(Guid.NewGuid(), [Mooca], "Mooca", Agora);

        var enviados = await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        enviados.Should().Be(0);
        _push.Verify(p => p.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Never);
        (await ctx.PedidosAvisoRota.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task AvaliarEDisparar_Vencido_ApagaSemPush()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        await svc.RegistrarAsync(Guid.NewGuid(), [Mooca], "Mooca", Agora);

        var enviados = await svc.AvaliarEDispararAsync(Agora.AddHours(LimiaresRota.ExpiracaoPedidoHoras).AddMinutes(1));

        enviados.Should().Be(0);
        _push.Verify(p => p.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Never);
        (await ctx.PedidosAvisoRota.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task AvaliarEDisparar_PushDesabilitado_NaoFazNada()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr, pushHabilitado: false);
        await svc.RegistrarAsync(Guid.NewGuid(), [Mooca], "Mooca", Agora);

        var enviados = await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        enviados.Should().Be(0);
        _rota.Verify(r => r.AvaliarAsync(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>()), Times.Never);
        (await ctx.PedidosAvisoRota.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task AvaliarEDisparar_NaoGravaNoLivroCaixa()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        await svc.RegistrarAsync(Guid.NewGuid(), [Mooca], "Mooca", Agora);

        await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        (await ctx.NotificacoesEnviadas.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task AvaliarEDisparar_FalhaEmUmPedido_NaoParaOsOutros()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        var quebrado = Guid.NewGuid();
        await svc.RegistrarAsync(quebrado, [Mooca], "Mooca", Agora);
        await svc.RegistrarAsync(Guid.NewGuid(), [Penha], "Penha", Agora);
        _push.Setup(p => p.NotificarUsuarioAsync(quebrado, It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()))
             .ThrowsAsync(new InvalidOperationException("boom"));

        var enviados = await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        enviados.Should().Be(1);
        (await ctx.PedidosAvisoRota.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Registrar_SegundoPedido_SubstituiOPrimeiro()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.Esperar);
        var usuario = Guid.NewGuid();

        await svc.RegistrarAsync(usuario, [Mooca], "Mooca", Agora);
        await svc.RegistrarAsync(usuario, [Penha], "Penha", Agora);

        var pedido = await ctx.PedidosAvisoRota.SingleAsync();
        pedido.Destino.Should().Be("Penha");
        pedido.SubprefeituraIds.Should().Be(Penha.ToString());
    }
}
