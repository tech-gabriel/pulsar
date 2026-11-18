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
        p.Chave.Should().Be($"dc:198700/2026:{ctx.Subprefeitura.Id}");
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

        a.Should().StartWith("dc:198700/2026:");
        b.Should().Be($"dc:198700/2026:{ctx.Subprefeitura.Id}");
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
}
