using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

/// <summary>
/// Motor ponta a ponta com SQLite e push falso: gera por subprefeitura, consolida por pessoa,
/// envia e grava. As regras de escolha (dedup, prioridade, teto) moram no Consolidador e são
/// testadas isoladamente em ConsolidadorTests; aqui fica a encanação.
/// </summary>
public class MotorNotificacoesTests
{
    private static readonly Guid Mooca = Guid.Parse("20000000-0000-0000-0000-000000000008");
    private static readonly Guid Penha = Guid.Parse("20000000-0000-0000-0000-000000000009");

    private readonly Mock<IPushNotificationService> _pushMock = new();
    private readonly Mock<IPrevisaoService> _previsaoMock = new();
    private readonly LoggerEspiao<MotorNotificacoes> _logger = new();

    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    /// <summary>Gatilho de teste que devolve sempre a pendência que recebe no construtor.</summary>
    private sealed class GatilhoFixo : IGatilhoNotificacao
    {
        private readonly NotificacaoPendente? _pendencia;
        public GatilhoFixo(string nome, NotificacaoPendente? pendencia)
        {
            Nome = nome;
            _pendencia = pendencia;
        }
        public string Nome { get; }
        public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
            ContextoGatilho ctx, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<NotificacaoPendente>>(
                _pendencia is null ? [] : [_pendencia]);
    }

    /// <summary>Gatilho que emite uma pendência por subprefeitura avaliada (chave por sub).</summary>
    private sealed class GatilhoPorSub : IGatilhoNotificacao
    {
        public GatilhoPorSub(string nome) => Nome = nome;
        public string Nome { get; }
        public List<string> Avaliadas { get; } = [];
        public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(ContextoGatilho ctx, CancellationToken ct = default)
        {
            Avaliadas.Add(ctx.Subprefeitura.Nome);
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>(
                [Pendencia(Nome, $"k:{ctx.Subprefeitura.Id}", 1, sub: ctx.Subprefeitura.Id, local: ctx.Subprefeitura.Nome)]);
        }
    }

    /// <summary>
    /// Gatilho que cancela o ciclo ANTES de devolver a própria pendência. Reproduz o
    /// desligamento do serviço no meio da avaliação.
    /// </summary>
    private sealed class GatilhoQueCancela : IGatilhoNotificacao
    {
        private readonly NotificacaoPendente _pendencia;
        private readonly CancellationTokenSource _cts;
        public GatilhoQueCancela(string nome, NotificacaoPendente pendencia, CancellationTokenSource cts)
        {
            Nome = nome;
            _pendencia = pendencia;
            _cts = cts;
        }
        public string Nome { get; }
        public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
            ContextoGatilho ctx, CancellationToken ct = default)
        {
            _cts.Cancel();
            return Task.FromResult<IReadOnlyList<NotificacaoPendente>>([_pendencia]);
        }
    }

    /// <summary>Logger que guarda as mensagens formatadas: a falha de fuso precisa ser ACHÁVEL.</summary>
    private sealed class LoggerEspiao<T> : ILogger<T>
    {
        public List<string> Mensagens { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
            => Mensagens.Add(formatter(state, exception));
    }

    private static NotificacaoPendente Pendencia(
        string gatilho, string chave, int prioridade, TimeSpan? cooldown = null,
        CriterioOptIn criterio = CriterioOptIn.RiscoAlto, Guid? sub = null, string local = "Mooca")
        => new(gatilho, chave, criterio,
               new PushPayload(Titulo: "T", Corpo: "C", Url: "/", Tag: "t"),
               prioridade, cooldown, sub ?? Mooca, local);

    private static async Task<Guid> PessoaComAparelhoAsync(PulsarDbContext ctx, bool alertaAlto = true, params Guid[] favoritas)
    {
        var u = new Usuario { Nome = "P", Email = $"{Guid.NewGuid()}@t.dev", SenhaHash = "x" };
        ctx.Usuarios.Add(u);
        ctx.AssinaturasPush.Add(new AssinaturaPush { UsuarioId = u.Id, Endpoint = $"https://e/{u.Id}", P256dh = "p", Auth = "a", AlertaAlto = alertaAlto });
        foreach (var s in favoritas)
            ctx.UsuarioSubprefeituras.Add(new UsuarioSubprefeitura { UsuarioId = u.Id, SubprefeituraId = s });
        await ctx.SaveChangesAsync();
        return u.Id;
    }

    private MotorNotificacoes NovoMotor(PulsarDbContext ctx, params IGatilhoNotificacao[] gatilhos)
    {
        _pushMock.SetupGet(p => p.Habilitado).Returns(true);
        _pushMock.Setup(p => p.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(1);
        _previsaoMock.Setup(p => p.ObterFaixasSubprefeituraAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(Array.Empty<FaixaPrevisaoDto>());
        return new MotorNotificacoes(ctx, new NotificacaoEnviadaRepository(ctx), _previsaoMock.Object,
            _pushMock.Object, gatilhos, _logger);
    }

    [Fact]
    public async Task PushDesabilitado_NaoAvaliaNemGrava()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComAparelhoAsync(ctx, true, Mooca);
        var gatilho = new GatilhoPorSub("score-alto");
        var motor = NovoMotor(ctx, gatilho);
        _pushMock.SetupGet(p => p.Habilitado).Returns(false);

        (await motor.AvaliarEDispararAsync()).Should().Be(0);
        gatilho.Avaliadas.Should().BeEmpty();
        (await ctx.NotificacoesEnviadas.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task DuasFavoritasEmRisco_UmPushSo_EDuasLinhasComOMesmoEnvioId()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var pessoa = await PessoaComAparelhoAsync(ctx, true, Mooca, Penha);
        var motor = NovoMotor(ctx, new GatilhoPorSub("score-alto"));

        (await motor.AvaliarEDispararAsync()).Should().Be(1);

        _pushMock.Verify(p => p.NotificarUsuarioAsync(pessoa, CriterioOptIn.RiscoAlto,
            It.Is<PushPayload>(x => x.Titulo == "Alerta em Mooca e Penha" || x.Titulo == "Alerta em Penha e Mooca"),
            It.IsAny<CancellationToken>()), Times.Once);
        var linhas = await ctx.NotificacoesEnviadas.Where(n => n.UsuarioId == pessoa).ToListAsync();
        linhas.Should().HaveCount(2);
        linhas.Select(l => l.EnvioId).Distinct().Should().ContainSingle();
    }

    [Fact]
    public async Task SegundoCicloComOMesmoEvento_NaoReenvia()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComAparelhoAsync(ctx, true, Mooca);
        var motor = NovoMotor(ctx, new GatilhoFixo("chuva-prevista", Pendencia("chuva-prevista", "chuva:fixa", 2)));

        await motor.AvaliarEDispararAsync();
        await motor.AvaliarEDispararAsync();

        _pushMock.Verify(x => x.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SemAparelhoComPreferencia_NadaSaiENadaEGravado()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComAparelhoAsync(ctx, alertaAlto: false, Mooca); // AlertaModerado e ResumoDiario já são false
        var motor = NovoMotor(ctx, new GatilhoPorSub("score-alto"));

        (await motor.AvaliarEDispararAsync()).Should().Be(0);
        (await ctx.NotificacoesEnviadas.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task SubprefeituraFavoritaInativa_NaoGeraPendenciaNemQuebra()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComAparelhoAsync(ctx, true, Mooca, Penha);
        var penha = await ctx.Subprefeituras.FindAsync(Penha);
        penha!.Ativa = false;
        await ctx.SaveChangesAsync();
        var gatilho = new GatilhoPorSub("score-alto");

        await NovoMotor(ctx, gatilho).AvaliarEDispararAsync();

        gatilho.Avaliadas.Should().Equal("Mooca");
    }

    [Fact]
    public async Task SoSubprefeiturasAcompanhadas_SaoAvaliadas()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComAparelhoAsync(ctx, true, Mooca);
        var gatilho = new GatilhoPorSub("score-alto");

        await NovoMotor(ctx, gatilho).AvaliarEDispararAsync();

        gatilho.Avaliadas.Should().Equal("Mooca");
    }

    [Fact]
    public async Task GatilhoQueLanca_NaoDerrubaOsOutros()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComAparelhoAsync(ctx, true, Mooca);
        var quebrado = new Mock<IGatilhoNotificacao>();
        quebrado.SetupGet(g => g.Nome).Returns("quebrado");
        quebrado.Setup(g => g.AvaliarAsync(It.IsAny<ContextoGatilho>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException());

        (await NovoMotor(ctx, quebrado.Object, new GatilhoPorSub("score-alto")).AvaliarEDispararAsync()).Should().Be(1);
    }

    [Fact]
    public async Task CicloCancelado_NaoDecideComGatilhosPelaMetade()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComAparelhoAsync(ctx, true, Mooca);
        using var cts = new CancellationTokenSource();
        var motor = NovoMotor(ctx,
            new GatilhoQueCancela("chuva-prevista", Pendencia("chuva-prevista", "c", 2), cts),
            new GatilhoPorSub("score-alto"));

        (await motor.AvaliarEDispararAsync(cts.Token)).Should().Be(0);
        _pushMock.Verify(x => x.NotificarUsuarioAsync(It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task FusoInvalido_PulaEDeixaRastro()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await PessoaComAparelhoAsync(ctx, true, Mooca);
        var leste = await ctx.Regioes.FirstAsync(r => r.Nome == "Leste");
        leste.FusoHorario = "Fuso/Inexistente";
        await ctx.SaveChangesAsync();

        (await NovoMotor(ctx, new GatilhoPorSub("score-alto")).AvaliarEDispararAsync()).Should().Be(0);
        _logger.Mensagens.Should().Contain(m => m.Contains("Fuso horário inválido") && m.Contains("Fuso/Inexistente"));
    }

    [Fact]
    public async Task AoRodar_AplicaRetencaoDoLivroCaixa()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var pessoa = await PessoaComAparelhoAsync(ctx, true, Mooca);
        await new NotificacaoEnviadaRepository(ctx).RegistrarAsync([new NotificacaoEnviada
        {
            UsuarioId = pessoa, SubprefeituraId = Mooca, Gatilho = "score-alto", Chave = "velha",
            EnvioId = Guid.NewGuid(), EnviadoEm = DateTime.UtcNow.AddDays(-40),
        }]);

        await NovoMotor(ctx).AvaliarEDispararAsync();

        (await ctx.NotificacoesEnviadas.AnyAsync(n => n.Chave == "velha")).Should().BeFalse();
    }
}
