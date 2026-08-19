using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class MotorNotificacoesTests
{
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

    /// <summary>
    /// Gatilho cuja Chave carrega o id da região. Só serve aos testes com MAIS de uma região:
    /// com chave fixa, a segunda região tentaria gravar a mesma Chave, que é índice único, e o
    /// insert estouraria dentro do try/catch por região, dando um verde acidental.
    /// </summary>
    private sealed class GatilhoPorRegiao : IGatilhoNotificacao
    {
        public GatilhoPorRegiao(string nome) => Nome = nome;
        public string Nome { get; }
        public Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
            ContextoGatilho ctx, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<NotificacaoPendente>>(
                [Pendencia(Nome, $"k:{ctx.Regiao.Id}", 1)]);
    }

    /// <summary>
    /// Gatilho que cancela o ciclo ANTES de devolver a própria pendência. Reproduz o
    /// desligamento do serviço no meio da avaliação: o loop de gatilhos para na iteração
    /// seguinte e a lista fica com o que deu tempo de coletar.
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

    /// <summary>
    /// Logger que guarda as mensagens já formatadas. Existe para um teste só, o do fuso
    /// inválido: a obrigação ali não é apenas "pular a região", é a falha ser ACHÁVEL nos
    /// logs, e isso só se assere lendo a mensagem.
    /// </summary>
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
        CriterioOptIn criterio = CriterioOptIn.RiscoAlto)
        => new(gatilho, chave, criterio,
               new PushPayload(Titulo: "T", Corpo: "C", Url: "/", Tag: "t"),
               prioridade, cooldown);

    /// <summary>
    /// O seed tem 5 regiões e o motor itera todas. Com um gatilho de chave fixa, a
    /// segunda região tentaria gravar a MESMA Chave, que é índice único: o insert
    /// estouraria, a exceção seria engolida pelo try/catch por região e o teste passaria
    /// por acidente. Deixar uma região só torna toda contagem abaixo inequívoca.
    /// </summary>
    private static async Task<Guid> DeixarSoUmaRegiaoAsync(PulsarDbContext ctx)
    {
        var manter = await ctx.Regioes.OrderBy(r => r.Nome).FirstAsync();

        // As subprefeituras saem antes porque a FK Regiao -> Subprefeitura é Restrict e não
        // Cascade: apagar a região com as filhas no lugar estoura FOREIGN KEY constraint failed.
        ctx.Subprefeituras.RemoveRange(
            await ctx.Subprefeituras.Where(s => s.RegiaoId != manter.Id).ToListAsync());
        ctx.Regioes.RemoveRange(
            await ctx.Regioes.Where(r => r.Id != manter.Id).ToListAsync());
        await ctx.SaveChangesAsync();
        return manter.Id;
    }

    private static Task RegistrarAsync(
        PulsarDbContext ctx, Guid regiaoId, string gatilho, string chave, DateTime enviadoEm)
        => new NotificacaoEnviadaRepository(ctx).RegistrarAsync(new NotificacaoEnviada
        {
            RegiaoId = regiaoId,
            Gatilho = gatilho,
            Chave = chave,
            EnviadoEm = enviadoEm,
            Destinatarios = 1,
        });

    private MotorNotificacoes NovoMotor(PulsarDbContext ctx, params IGatilhoNotificacao[] gatilhos)
    {
        _pushMock.SetupGet(p => p.Habilitado).Returns(true);
        _pushMock
            .Setup(p => p.NotificarRegiaoAsync(
                It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);
        _previsaoMock
            .Setup(s => s.ObterFaixasRegiaoAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        return new MotorNotificacoes(
            ctx,
            new NotificacaoEnviadaRepository(ctx),
            _previsaoMock.Object,
            _pushMock.Object,
            gatilhos,
            _logger);
    }

    [Fact]
    public async Task PushDesabilitado_NaoAvaliaNemGrava()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await DeixarSoUmaRegiaoAsync(ctx);

        var gatilho = new Mock<IGatilhoNotificacao>();
        gatilho.SetupGet(g => g.Nome).Returns("g");
        gatilho
            .Setup(g => g.AvaliarAsync(It.IsAny<ContextoGatilho>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<NotificacaoPendente> { Pendencia("g", "k", 1) });

        var motor = NovoMotor(ctx, gatilho.Object);
        _pushMock.SetupGet(p => p.Habilitado).Returns(false);

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(0);
        gatilho.Verify(
            g => g.AvaliarAsync(It.IsAny<ContextoGatilho>(), It.IsAny<CancellationToken>()),
            Times.Never,
            "sem chaves VAPID, avaliar gatilho é trabalho de banco jogado fora");
        (await ctx.NotificacoesEnviadas.CountAsync()).Should().Be(0,
            "gravar chave de push que não aconteceu calaria o aviso de verdade quando o push ligasse");
    }

    [Fact]
    public async Task PendenciaNova_EnviaEGravaNoLivroCaixa()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // Critério diferente do padrão de propósito: assim o Verify abaixo prova que o motor
        // repassa o critério DA PENDÊNCIA, e não um valor fixo dele próprio.
        var pendencia = Pendencia("g", "chave-unica", 1, criterio: CriterioOptIn.ResumoDiario);
        var motor = NovoMotor(ctx, new GatilhoFixo("g", pendencia));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(2, "o mock de push devolve 2 destinatários");
        _pushMock.Verify(p => p.NotificarRegiaoAsync(
            regiaoId, CriterioOptIn.ResumoDiario, pendencia.Payload, It.IsAny<CancellationToken>()),
            Times.Once);

        var registro = await ctx.NotificacoesEnviadas.SingleAsync();
        registro.RegiaoId.Should().Be(regiaoId);
        registro.Gatilho.Should().Be("g");
        registro.Chave.Should().Be("chave-unica");
        registro.Destinatarios.Should().Be(2);
        registro.EnviadoEm.Kind.Should().Be(DateTimeKind.Utc,
            "o Npgsql recusa qualquer outro Kind nesta coluna");
    }

    [Fact]
    public async Task ChaveJaGravada_NaoReenvia()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);
        await RegistrarAsync(ctx, regiaoId, "g", "ja-foi", DateTime.UtcNow);

        var motor = NovoMotor(ctx, new GatilhoFixo("g", Pendencia("g", "ja-foi", 1)));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(0);
        _pushMock.Verify(p => p.NotificarRegiaoAsync(
            It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SemCooldown_ChaveDiferente_Reenvia()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // Mesmo gatilho, chave diferente, e o gatilho não pediu cooldown: o dedup aqui é da
        // CHAVE, então uma faixa de previsão nova tem que voltar a avisar. Sem este teste, um
        // dedup que olhasse só "este gatilho já enviou alguma vez" passaria despercebido.
        await RegistrarAsync(ctx, regiaoId, "chuva-prevista", "chuva:15h", DateTime.UtcNow);

        var motor = NovoMotor(ctx, new GatilhoFixo(
            "chuva-prevista", Pendencia("chuva-prevista", "chuva:18h", 2)));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(2);
        (await ctx.NotificacoesEnviadas.CountAsync(n => n.RegiaoId == regiaoId)).Should().Be(2);
    }

    [Fact]
    public async Task CooldownAtivo_NaoReenviaMesmoComChaveDiferente()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // 10 segundos DENTRO da fronteira, e não 30 minutos: pinçar a fronteira reprova
        // qualquer janela que não seja a hora pedida, enquanto -30/-90 min passaria também
        // com 45 ou 75 min. Os 10s são só a folga entre este relógio e o do motor, que
        // captura o próprio UtcNow alguns milissegundos depois.
        await RegistrarAsync(ctx, regiaoId, "score-alto", "score:antigo",
            DateTime.UtcNow.AddHours(-1).AddSeconds(10));

        // Chave diferente, mas dentro do cooldown de 1h: não deve sair.
        var motor = NovoMotor(ctx, new GatilhoFixo(
            "score-alto", Pendencia("score-alto", "score:novo", 1, TimeSpan.FromHours(1))));

        await motor.AvaliarEDispararAsync();

        (await ctx.NotificacoesEnviadas.CountAsync(n => n.RegiaoId == regiaoId)).Should().Be(1,
            "o cooldown é janela deslizante e ignora a chave");
    }

    [Fact]
    public async Task CooldownExpirado_Reenvia()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // O lado de fora da mesma fronteira, a 10 segundos dela. Ver o teste irmão.
        await RegistrarAsync(ctx, regiaoId, "score-alto", "score:antigo",
            DateTime.UtcNow.AddHours(-1).AddSeconds(-10));

        var motor = NovoMotor(ctx, new GatilhoFixo(
            "score-alto", Pendencia("score-alto", "score:novo", 1, TimeSpan.FromHours(1))));

        await motor.AvaliarEDispararAsync();

        (await ctx.NotificacoesEnviadas.CountAsync(n => n.RegiaoId == regiaoId)).Should().Be(2);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DoisGatilhos_SaiSoODeMaiorPrioridade(bool urgentePrimeiro)
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await DeixarSoUmaRegiaoAsync(ctx);

        var chuva = new GatilhoFixo("chuva-prevista", Pendencia("chuva-prevista", "chuva:k", 2));
        var score = new GatilhoFixo("score-alto",
            Pendencia("score-alto", "score:k", 1, TimeSpan.FromHours(1)));

        // As duas ordens de registro, porque a escolha tem que ser pela Prioridade: rodar só
        // uma delas deixaria passar um motor que pegasse o primeiro (ou o último) da lista.
        IGatilhoNotificacao[] gatilhos = urgentePrimeiro ? [score, chuva] : [chuva, score];

        var motor = NovoMotor(ctx, gatilhos);

        await motor.AvaliarEDispararAsync();

        var gravados = await ctx.NotificacoesEnviadas.Select(n => n.Gatilho).ToListAsync();
        gravados.Should().ContainSingle(
            "sai uma por ciclo: avisar que vai chover às 18h enquanto chove forte agora é ruído")
            .Which.Should().Be("score-alto");
    }

    [Fact]
    public async Task PrioritariaJaCoberta_NaoBloqueiaAProximaDaFila()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // Manhã inteira de risco alto: o gatilho de score emite pendência a cada ciclo, e o
        // cooldown cobre 45 dos 60 minutos. Se o dedup fosse aplicado só DEPOIS de escolher,
        // a pendência coberta consumiria a vaga do ciclo e o briefing diário, que só tem a
        // janela da manhã, não sairia justamente nos dias em que chove.
        await RegistrarAsync(ctx, regiaoId, "score-alto", "score:ja-foi",
            DateTime.UtcNow.AddMinutes(-10));

        var motor = NovoMotor(ctx,
            new GatilhoFixo("score-alto",
                Pendencia("score-alto", "score:agora", 1, TimeSpan.FromHours(1))),
            new GatilhoFixo("briefing-diario",
                Pendencia("briefing-diario", "briefing:hoje", 3, criterio: CriterioOptIn.ResumoDiario)));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(2);
        var gravados = await ctx.NotificacoesEnviadas
            .Where(n => n.Chave != "score:ja-foi").Select(n => n.Gatilho).ToListAsync();
        gravados.Should().ContainSingle().Which.Should().Be("briefing-diario");
    }

    [Fact]
    public async Task TetoDiario_CortaOPushSeguinteDaRegiao()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // Envios de agora, e não de dezenas de minutos atrás: qualquer recuo grande arrisca
        // cair do outro lado da meia-noite local e tirar a linha da contagem do dia.
        for (var i = 1; i <= LimiaresNotificacao.MaxPushPorRegiaoPorDia; i++)
            await RegistrarAsync(ctx, regiaoId, "chuva-prevista", $"chuva:{i}",
                DateTime.UtcNow.AddSeconds(-i));

        // Prioridade da constante e não um 2 solto: o teto isenta a prioridade de risco alto,
        // então é preciso ler no teste que esta pendência NÃO é a isenta, senão o verde aqui
        // passaria a poder vir do caminho errado.
        var motor = NovoMotor(ctx, new GatilhoFixo(
            "chuva-prevista",
            Pendencia("chuva-prevista", "chuva:seguinte", LimiaresNotificacao.PrioridadeChuvaPrevista)));

        await motor.AvaliarEDispararAsync();

        _pushMock.Verify(p => p.NotificarRegiaoAsync(
            It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()),
            Times.Never);
        (await ctx.NotificacoesEnviadas.CountAsync(n => n.RegiaoId == regiaoId))
            .Should().Be(LimiaresNotificacao.MaxPushPorRegiaoPorDia,
                "o teto por região por dia é a rede contra tarde caótica");
    }

    [Fact]
    public async Task TetoDiario_DeixaPassarOUltimoAbaixoDoLimite()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // Um a menos que o teto: o lado de dentro da mesma fronteira que o teste irmão pinça
        // por fora. Juntos eles fixam o corte no valor da constante, e não num intervalo.
        for (var i = 1; i < LimiaresNotificacao.MaxPushPorRegiaoPorDia; i++)
            await RegistrarAsync(ctx, regiaoId, "chuva-prevista", $"chuva:{i}",
                DateTime.UtcNow.AddSeconds(-i));

        var motor = NovoMotor(ctx, new GatilhoFixo(
            "chuva-prevista",
            Pendencia("chuva-prevista", "chuva:ultimo", LimiaresNotificacao.PrioridadeChuvaPrevista)));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(2);
        (await ctx.NotificacoesEnviadas.CountAsync(n => n.RegiaoId == regiaoId))
            .Should().Be(LimiaresNotificacao.MaxPushPorRegiaoPorDia);
    }

    [Fact]
    public async Task TetoDiario_NaoContaEnvioDeOutroDiaLocal()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // Envios de 24h atrás: DENTRO da janela consultada (JanelaTetoDiarioHoras) e FORA do
        // dia local. Contar linhas da janela sem converter cada instante para o fuso da região
        // cortaria este push, então é este teste que prende o filtro por dia local.
        for (var i = 1; i <= LimiaresNotificacao.MaxPushPorRegiaoPorDia; i++)
            await RegistrarAsync(ctx, regiaoId, "chuva-prevista", $"chuva:{i}",
                DateTime.UtcNow.AddHours(-24).AddSeconds(-i));

        var motor = NovoMotor(ctx, new GatilhoFixo(
            "chuva-prevista",
            Pendencia("chuva-prevista", "chuva:hoje", LimiaresNotificacao.PrioridadeChuvaPrevista)));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(2, "o teto é diário, e ontem não conta para o dia de hoje");
    }

    [Fact]
    public async Task TetoDiarioEstourado_AindaDeixaPassarORiscoAlto()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // A manhã da tempestade descrita na revisão: o teto do dia já foi gasto por conteúdo
        // comum e às 14h o risco piora. Sem a isenção, a região fica calada pelo resto do dia
        // local justamente no aviso que existe para tirar gente de área de alagamento.
        // AddSeconds e não AddMinutes pelo mesmo motivo dos testes de teto acima: recuo grande
        // arrisca cair do outro lado da meia-noite local e sumir da contagem do dia.
        for (var i = 1; i <= LimiaresNotificacao.MaxPushPorRegiaoPorDia; i++)
            await RegistrarAsync(ctx, regiaoId, "chuva-prevista", $"chuva:{i}",
                DateTime.UtcNow.AddSeconds(-i));

        var motor = NovoMotor(ctx, new GatilhoFixo("score-alto",
            Pendencia("score-alto", "score:piorou", LimiaresNotificacao.PrioridadeScoreAlto,
                LimiaresNotificacao.CooldownScoreAlto)));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(2, "o teto diário não pode calar o aviso de risco alto");
        (await ctx.NotificacoesEnviadas.CountAsync(n => n.RegiaoId == regiaoId))
            .Should().Be(LimiaresNotificacao.MaxPushPorRegiaoPorDia + 1,
                "a isenção é de CONSULTAR o teto; o envio segue sendo gravado no livro-caixa");
    }

    [Fact]
    public async Task RiscoAltoIsento_AindaGastaOTetoDosOutrosGatilhos()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        // A outra metade da isenção, e a que é fácil implementar errado: se o teto passasse a
        // IGNORAR as linhas de risco alto em vez de só não ser consultado por elas, uma
        // tempestade liberaria de brinde um dia inteiro de chuva prevista e briefing por cima
        // dos avisos de risco. O irmão acima (teto cheio de chuva, risco alto passa) não pega
        // isso: lá as linhas do teto são de outro gatilho.
        for (var i = 1; i <= LimiaresNotificacao.MaxPushPorRegiaoPorDia; i++)
            await RegistrarAsync(ctx, regiaoId, "score-alto", $"score:{i}",
                DateTime.UtcNow.AddSeconds(-i));

        var motor = NovoMotor(ctx, new GatilhoFixo("chuva-prevista",
            Pendencia("chuva-prevista", "chuva:depois-da-tempestade",
                LimiaresNotificacao.PrioridadeChuvaPrevista)));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(0);
        (await ctx.NotificacoesEnviadas.CountAsync(n => n.RegiaoId == regiaoId))
            .Should().Be(LimiaresNotificacao.MaxPushPorRegiaoPorDia,
                "envio de risco alto conta para o teto, senão o volume não crítico fica sem limite");
    }

    [Fact]
    public async Task AoRodar_AplicaRetencaoDoLivroCaixa()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var regiaoId = await DeixarSoUmaRegiaoAsync(ctx);

        var agora = DateTime.UtcNow;
        await RegistrarAsync(ctx, regiaoId, "score-alto", "expirado",
            agora.AddDays(-LimiaresNotificacao.RetencaoLivroCaixaDias - 1));
        await RegistrarAsync(ctx, regiaoId, "score-alto", "no-prazo",
            agora.AddDays(-LimiaresNotificacao.RetencaoLivroCaixaDias + 1));

        var motor = NovoMotor(ctx, new GatilhoFixo("g", null));
        await motor.AvaliarEDispararAsync();

        var chaves = await ctx.NotificacoesEnviadas.Select(n => n.Chave).ToListAsync();
        chaves.Should().BeEquivalentTo(new[] { "no-prazo" },
            "sem retenção o livro-caixa cresce para sempre, e com retenção curta demais a " +
            "chave esquecida voltaria a notificar");
    }

    [Fact]
    public async Task GatilhoQueLanca_NaoDerrubaOsOutrosDaMesmaRegiao()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await DeixarSoUmaRegiaoAsync(ctx);
        var nomeRegiao = (await ctx.Regioes.SingleAsync()).Nome;

        var explosivo = new Mock<IGatilhoNotificacao>();
        explosivo.SetupGet(g => g.Nome).Returns("explosivo");
        explosivo
            .Setup(g => g.AvaliarAsync(It.IsAny<ContextoGatilho>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var motor = NovoMotor(ctx, explosivo.Object,
            new GatilhoFixo("briefing-diario", Pendencia("briefing-diario", "brief:k", 3)));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(2, "o gatilho sadio ainda envia");
        (await ctx.NotificacoesEnviadas.SingleAsync()).Gatilho.Should().Be("briefing-diario");
        _logger.Mensagens.Should().Contain(m => m.Contains("explosivo") && m.Contains(nomeRegiao),
            "sem o nome do gatilho e o da região, a falha não é diagnosticável");
    }

    [Fact]
    public async Task CicloCancelado_NaoDecideComGatilhosPelaMetade()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        await DeixarSoUmaRegiaoAsync(ctx);

        using var cts = new CancellationTokenSource();

        // O gatilho de MENOR prioridade roda primeiro e derruba o ciclo; o de risco alto, que
        // venceria a escolha, nunca chega a ser consultado. Sem a guarda, o motor decidiria em
        // cima da lista pela metade e mandaria o aviso de chuva JUSTAMENTE por faltar o de
        // risco alto. O mock de push ignora o token de propósito: a guarda tem que valer por si,
        // e não por o cliente de push acabar lançando.
        var motor = NovoMotor(ctx,
            new GatilhoQueCancela("chuva-prevista", Pendencia("chuva-prevista", "chuva:k", 2), cts),
            new GatilhoFixo("score-alto",
                Pendencia("score-alto", "score:k", 1, TimeSpan.FromHours(1))));

        var enviados = await motor.AvaliarEDispararAsync(cts.Token);

        enviados.Should().Be(0);
        _pushMock.Verify(p => p.NotificarRegiaoAsync(
            It.IsAny<Guid>(), It.IsAny<CriterioOptIn>(), It.IsAny<PushPayload>(), It.IsAny<CancellationToken>()),
            Times.Never);
        (await ctx.NotificacoesEnviadas.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task FusoInvalido_PulaSoAquelaRegiaoEDeixaRastro()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var boaId = await DeixarSoUmaRegiaoAsync(ctx);

        // FusoHorario é texto livre: um typo aqui derruba o FindSystemTimeZoneById na montagem
        // do contexto, ANTES de qualquer gatilho rodar. A região do typo nunca mais notifica,
        // e é por isso que a mensagem dela tem que ser distinguível do aviso genérico.
        var torta = new Regiao { Nome = "Fuso Torto", FusoHorario = "America/Nao_Existe" };
        ctx.Regioes.Add(torta);
        await ctx.SaveChangesAsync();

        var motor = NovoMotor(ctx, new GatilhoPorRegiao("g"));

        var enviados = await motor.AvaliarEDispararAsync();

        enviados.Should().Be(2, "a região de fuso bom segue notificando");
        (await ctx.NotificacoesEnviadas.SingleAsync()).RegiaoId.Should().Be(boaId);

        _logger.Mensagens.Should().NotContain(m => m.Contains("Falha ao avaliar"),
            "cair no aviso genérico é justamente o que esconde uma região muda para sempre");
        _logger.Mensagens.Should()
            .ContainSingle(m => m.Contains("Fuso horário inválido"))
            .Which.Should().Contain("Fuso Torto").And.Contain("America/Nao_Existe");
    }
}
