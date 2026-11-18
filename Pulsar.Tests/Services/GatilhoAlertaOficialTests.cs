using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

/// <summary>
/// Regra C do user (17/11/2026): o Extremo vira push sempre, citando a fonte; os outros níveis só
/// com sinal próprio do Pulsar no mesmo lugar; na capital, sem duplicar com o CGE.
/// </summary>
public class GatilhoAlertaOficialTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    private static readonly DateTime Agora = new(2026, 11, 18, 17, 30, 0, DateTimeKind.Utc);

    private static AlertaOficial Alerta(string gravidade, string evento = "CHUVAS INTENSAS") => new()
    {
        Identificador = "198700/2026", Evento = evento, Gravidade = gravidade, Urgencia = "Expected",
        InicioUtc = new DateTime(2026, 11, 18, 17, 5, 0, DateTimeKind.Utc), ExpiraUtc = Agora.AddHours(2),
        Emissor = "Defesa Civil Estadual De São Paulo",
        Titulo = "Defesa Civil:14h05 Chuva forte na capital. Risco de alagamento. Evite areas de risco!",
    };

    private static ContextoGatilho Contexto(AlertaOficial alerta, FaixaRisco alagamento = FaixaRisco.BAIXO,
        FaixaRisco vento = FaixaRisco.BAIXO, double? chuvaMedida3h = null, int pontosCge = 0)
    {
        var sub = new Subprefeitura { Nome = "Sé", Ativa = true };
        var score = new ScorePerigo
        {
            SubprefeituraId = sub.Id, Faixa = (FaixaRisco)Math.Max((int)alagamento, (int)vento),
            FaixaAlagamento = alagamento, FaixaVento = vento, FaixaCalor = FaixaRisco.BAIXO,
            Chuva3hMedidaMm = chuvaMedida3h, Timestamp = Agora,
        };
        return new()
        {
            Estado = new EstadoSubprefeitura(sub, score, null),
            Fuso = Sp,
            Previsao = Array.Empty<FaixaPrevisaoDto>(),
            AgoraUtc = Agora,
            PontosCgeAtivos = [.. Enumerable.Range(0, pontosCge).Select(_ => new PontoAlagamentoCge { SubprefeituraId = sub.Id, Ativo = true })],
            AlertasOficiaisAtivos = [alerta],
        };
    }

    private static Task<IReadOnlyList<NotificacaoPendente>> Avaliar(ContextoGatilho ctx) => new GatilhoAlertaOficial().AvaliarAsync(ctx);

    [Fact]
    public async Task Extremo_SemSinal_Notifica()
    {
        var ctx = Contexto(Alerta("Extreme"));

        var p = (await Avaliar(ctx)).Should().ContainSingle().Subject;

        p.Gatilho.Should().Be("alerta-oficial");
        p.Prioridade.Should().Be(0); // mesmo nível do Perigo do CGE: fora do teto diário
        p.Criterio.Should().Be(CriterioOptIn.RiscoAlto);
        p.Cooldown.Should().BeNull();
        p.Chave.Should().Be($"dc:3:ALAGAMENTO:198700/2026:{ctx.Subprefeitura.Id}");
        p.Payload.Corpo.Should().Contain("Defesa Civil").And.Contain("14h05").And.Contain("Chuva forte na capital");
        p.Payload.Corpo.Should().NotContain("Defesa Civil:14h05");
        p.Payload.Tag.Should().Be($"alerta-{ctx.Subprefeitura.Id}");
    }

    [Fact]
    public async Task Severo_SemSinal_NaoNotifica()
        => (await Avaliar(Contexto(Alerta("Severe")))).Should().BeEmpty();

    [Fact]
    public async Task Severo_ComAlagamentoEmAtencao_Notifica()
        => (await Avaliar(Contexto(Alerta("Severe"), alagamento: FaixaRisco.MODERADO))).Should().ContainSingle()
            .Which.Prioridade.Should().Be(1);

    [Fact]
    public async Task Severo_ComChuvaMedida2mm_Notifica()
        => (await Avaliar(Contexto(Alerta("Severe"), chuvaMedida3h: 2))).Should().ContainSingle();

    [Fact]
    public async Task Moderado_ComChuvaMedidaAbaixoDe1mm_NaoNotifica()
        => (await Avaliar(Contexto(Alerta("Moderate"), chuvaMedida3h: 0.4))).Should().BeEmpty();

    [Fact]
    public async Task Vendaval_ComAlagamentoEmAtencaoMasVentoBaixo_NaoNotifica()
        => (await Avaliar(Contexto(Alerta("Severe", "VENDAVAL"), alagamento: FaixaRisco.MODERADO))).Should().BeEmpty();

    [Fact]
    public async Task Vendaval_ComVentoEmAtencao_Notifica()
        => (await Avaliar(Contexto(Alerta("Severe", "VENDAVAL"), vento: FaixaRisco.MODERADO))).Should().ContainSingle();

    // Na capital, o CGE já avisou do alagamento: o alerta não Extremo não vira um segundo push.
    [Fact]
    public async Task Capital_ComPontoCgeAtivo_AlertaSevero_NaoNotifica()
        => (await Avaliar(Contexto(Alerta("Severe"), alagamento: FaixaRisco.ALTO, pontosCge: 1))).Should().BeEmpty();

    [Fact]
    public async Task Capital_ComPontoCgeAtivo_AlertaExtremo_Notifica()
        => (await Avaliar(Contexto(Alerta("Extreme"), pontosCge: 1))).Should().ContainSingle();

    [Fact]
    public async Task MesmoAlertaDuasVezes_MesmaChave()
    {
        var a = (await Avaliar(Contexto(Alerta("Extreme")))).Single().Chave;
        var ctx = Contexto(Alerta("Extreme"));
        var b = (await Avaliar(ctx)).Single().Chave;

        a.Should().StartWith("dc:3:ALAGAMENTO:198700/2026:");
        b.Should().EndWith($":198700/2026:{ctx.Subprefeitura.Id}");
    }

    [Fact]
    public async Task SemAlerta_NadaANotificar()
    {
        var ctx = Contexto(Alerta("Extreme"));
        var vazio = new ContextoGatilho
        {
            Estado = ctx.Estado, Fuso = Sp, Previsao = ctx.Previsao, AgoraUtc = Agora,
        };

        (await Avaliar(vazio)).Should().BeEmpty();
    }

    // O livro-caixa lembra os envios de 48 h; um alerta que dura mais (a IDAP já trouxe um de 75 h)
    // não pode ser avisado de novo quando o primeiro envio sai dessa janela.
    [Fact]
    public async Task AlertaMaisVelhoQueAJanelaDoLivroCaixa_NaoNotificaDeNovo()
    {
        var velho = Alerta("Extreme");
        velho.InicioUtc = Agora.AddHours(-LimiaresNotificacao.JanelaTetoDiarioHoras + 0.5);
        velho.ExpiraUtc = Agora.AddHours(20);

        (await Avaliar(Contexto(velho))).Should().BeEmpty();
    }

    // Decisão do user (18/11/2026): Minor e Unknown ficam só no app, sem push.
    [Theory]
    [InlineData("Minor")]
    [InlineData("Unknown")]
    public async Task MinorEUnknown_NaoNotificam(string gravidade)
        => (await Avaliar(Contexto(Alerta(gravidade), alagamento: FaixaRisco.ALTO, chuvaMedida3h: 10))).Should().BeEmpty();

    [Theory]
    [InlineData("Moderate", 1, true)]
    [InlineData("Severe", 2, true)]
    [InlineData("Extreme", 3, false)]
    public async Task Nivel_ChaveECooldown(string gravidade, int nivel, bool comCooldown)
    {
        var ctx = Contexto(Alerta(gravidade), alagamento: FaixaRisco.MODERADO);
        var p = (await Avaliar(ctx)).Should().ContainSingle().Subject;
        p.Nivel.Should().Be(nivel);
        p.Chave.Should().Be($"dc:{nivel}:ALAGAMENTO:198700/2026:{ctx.Subprefeitura.Id}");
        (p.Cooldown == TimeSpan.FromHours(3)).Should().Be(comCooldown);
        if (!comCooldown) p.Cooldown.Should().BeNull();
    }

    // Lembrete (decisão do user, 18/11/2026): depois das 3 h, o mesmo tipo de alerta que segue valendo
    // sai curto e atualizado, sem o horário antigo do texto da Defesa Civil.
    [Fact]
    public async Task Lembrete_TextoCurtoComAteQuando()
    {
        var p = (await Avaliar(Contexto(Alerta("Moderate"), alagamento: FaixaRisco.MODERADO))).Single();
        p.Lembrete.Should().NotBeNull();
        p.Lembrete!.Titulo.Should().Be($"Alerta da Defesa Civil segue valendo {NomesSubprefeitura.ComPreposicao(p.Local)}");
        p.Lembrete.Corpo.Should().Be("Chuvas intensas até 16:30. Toque para ver o aviso.");
        p.Lembrete.Url.Should().Be(p.Payload.Url);
    }

    // Vencendo em outro dia, o lembrete leva a data (como no app).
    [Fact]
    public async Task Lembrete_VenceEmOutroDia_LevaAData()
    {
        var alerta = Alerta("Moderate");
        alerta.ExpiraUtc = new DateTime(2026, 11, 21, 19, 18, 0, DateTimeKind.Utc);
        (await Avaliar(Contexto(alerta, alagamento: FaixaRisco.MODERADO))).Single().Lembrete!.Corpo
            .Should().Be("Chuvas intensas até 21/11, 16:18. Toque para ver o aviso.");
    }

    // O corte do corpo não pode partir um emoji ao meio (o aparelho mostra um caractere quebrado).
    [Fact]
    public async Task CorpoLongoComEmoji_NaoPartePar()
    {
        var alerta = Alerta("Extreme");
        alerta.Titulo = "Defesa Civil: " + new string('a', 140) + "🌧️🌧️🌧️🌧️🌧️🌧️🌧️🌧️🌧️🌧️🌧️🌧️🌧️🌧️";
        var corpo = (await Avaliar(Contexto(alerta))).Single().Payload.Corpo;
        corpo.Length.Should().BeLessThanOrEqualTo(180);
        for (var i = 0; i < corpo.Length; i++)
            if (char.IsHighSurrogate(corpo[i])) (i + 1 < corpo.Length && char.IsLowSurrogate(corpo[i + 1])).Should().BeTrue();
    }
}
