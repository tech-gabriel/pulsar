using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
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
        _rota.Setup(r => r.AvaliarAsync(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CaminhoRota?>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(new RotaAvaliacaoDto(estado, null, null, null, [], []));
        return new AvisoRotaService(ctx, _rota.Object, _push.Object, NullLogger<AvisoRotaService>.Instance);
    }

    /// <summary>Pedido de quem tem um aparelho inscrito (sem FK no teste: a assinatura só precisa existir).</summary>
    private static async Task Pedir(PulsarDbContext ctx, AvisoRotaService svc, Guid usuario, IReadOnlyList<Guid> ids, string destino)
    {
        ctx.AssinaturasPush.Add(new AssinaturaPush { UsuarioId = usuario, Endpoint = $"https://push/{usuario}" });
        await ctx.SaveChangesAsync();
        await svc.RegistrarAsync(usuario, ids, destino, Agora);
    }

    private static SqliteConnection Abrir()
    {
        var conn = new SqliteConnection("Data Source=:memory:;Foreign Keys=False");
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
        await Pedir(ctx, svc, usuario, [Mooca, Penha], "Penha");

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
        await Pedir(ctx, svc, Guid.NewGuid(), [Mooca], "Mooca");

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
        await Pedir(ctx, svc, Guid.NewGuid(), [Mooca], "Mooca");

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
        await Pedir(ctx, svc, Guid.NewGuid(), [Mooca], "Mooca");

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
        await Pedir(ctx, svc, Guid.NewGuid(), [Mooca], "Mooca");

        var enviados = await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        enviados.Should().Be(0);
        _rota.Verify(r => r.AvaliarAsync(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CaminhoRota?>(), It.IsAny<CancellationToken>()), Times.Never);
        (await ctx.PedidosAvisoRota.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task AvaliarEDisparar_NaoGravaNoLivroCaixa()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        await Pedir(ctx, svc, Guid.NewGuid(), [Mooca], "Mooca");

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
        await Pedir(ctx, svc, quebrado, [Mooca], "Mooca");
        await Pedir(ctx, svc, Guid.NewGuid(), [Penha], "Penha");
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

    [Fact]
    public async Task AvaliarEDisparar_SoModeradoRecebe_TentaOsCriteriosEApaga()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        var usuario = Guid.NewGuid();
        _push.Setup(p => p.NotificarUsuarioAsync(usuario, CriterioOptIn.RiscoAlto, It.IsAny<PushPayload>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _push.Setup(p => p.NotificarUsuarioAsync(usuario, CriterioOptIn.RiscoModerado, It.IsAny<PushPayload>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
        await Pedir(ctx, svc, usuario, [Mooca], "Mooca");

        var enviados = await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        enviados.Should().Be(1);
        _push.Verify(p => p.NotificarUsuarioAsync(usuario, CriterioOptIn.ResumoDiario, It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Never);
        (await ctx.PedidosAvisoRota.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task AvaliarEDisparar_AparelhoSoComChuvaLocais_Recebe()
    {
        // F4b: a preferência nova vem ligada; um aparelho com só ela ligada também conta.
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        var usuario = Guid.NewGuid();
        _push.Setup(p => p.NotificarUsuarioAsync(usuario, It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _push.Setup(p => p.NotificarUsuarioAsync(usuario, CriterioOptIn.ChuvaLocais, It.IsAny<PushPayload>(), It.IsAny<CancellationToken>())).ReturnsAsync(1);
        await Pedir(ctx, svc, usuario, [Mooca], "Mooca");

        (await svc.AvaliarEDispararAsync(Agora.AddMinutes(15))).Should().Be(1);
    }

    [Fact]
    public async Task AvaliarEDisparar_NenhumAparelhoRecebe_MantemOPedido()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        _push.Setup(p => p.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);
        await Pedir(ctx, svc, Guid.NewGuid(), [Mooca], "Mooca");

        var enviados = await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        enviados.Should().Be(0);
        (await ctx.PedidosAvisoRota.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task AvaliarEDisparar_SemAparelhoInscrito_MantemSemTentarOsCriterios()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        await svc.RegistrarAsync(Guid.NewGuid(), [Mooca], "Mooca", Agora);

        var enviados = await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        enviados.Should().Be(0);
        _push.Verify(p => p.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Never);
        (await ctx.PedidosAvisoRota.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task AvaliarEDisparar_PrimeiroCriterioAlcancou_NaoTentaOsOutros()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.PodeIr);
        var usuario = Guid.NewGuid();
        await Pedir(ctx, svc, usuario, [Mooca], "Mooca");

        await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        _push.Verify(p => p.NotificarUsuarioAsync(usuario, CriterioOptIn.RiscoModerado, It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Never);
        _push.Verify(p => p.NotificarUsuarioAsync(usuario, CriterioOptIn.ResumoDiario, It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // Entrega 3b: o pedido guarda a origem e o destino, e a reavaliação lê os trechos do caminho.
    [Fact]
    public async Task AvaliarEDisparar_PedidoComCaminho_ReavaliaPelosTrechos()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.Esperar);
        var usuario = Guid.NewGuid();
        var caminho = new CaminhoRota(-23.55, -46.63, -23.54, -46.60);
        ctx.AssinaturasPush.Add(new AssinaturaPush { UsuarioId = usuario, Endpoint = "https://push/caminho" });
        await ctx.SaveChangesAsync();

        await svc.RegistrarAsync(usuario, [Mooca], "Mooca", Agora, caminho);
        await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        _rota.Verify(r => r.AvaliarAsync(It.IsAny<IReadOnlyList<Guid>>(), caminho, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AvaliarEDisparar_PedidoSemCaminho_ReavaliaPelaArea()
    {
        using var conn = Abrir();
        using var ctx = NovoContexto(conn);
        var svc = Novo(ctx, EstadoRota.Esperar);
        var usuario = Guid.NewGuid();
        ctx.AssinaturasPush.Add(new AssinaturaPush { UsuarioId = usuario, Endpoint = "https://push/area" });
        await ctx.SaveChangesAsync();

        await svc.RegistrarAsync(usuario, [Mooca], "Mooca", Agora);
        await svc.AvaliarEDispararAsync(Agora.AddMinutes(15));

        _rota.Verify(r => r.AvaliarAsync(It.IsAny<IReadOnlyList<Guid>>(), null, It.IsAny<CancellationToken>()), Times.Once);
    }
}
