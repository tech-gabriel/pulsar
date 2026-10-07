using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class GatilhoAtencaoTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    private static readonly DateTime Agora = new(2026, 10, 7, 18, 0, 0, DateTimeKind.Utc); // 15h em SP

    private static ContextoGatilho Ctx(FaixaRisco geral,
        FaixaRisco alag = FaixaRisco.BAIXO, FaixaRisco vento = FaixaRisco.BAIXO, FaixaRisco calor = FaixaRisco.BAIXO,
        TipoPerigo principal = TipoPerigo.ALAGAMENTO, double chuva3h = 6, DateTime? agora = null)
        => new()
        {
            Estado = new EstadoSubprefeitura(
                new Subprefeitura { Nome = "Mooca", Ativa = true },
                new ScorePerigo { Faixa = geral, PerigoPrincipal = principal, FaixaAlagamento = alag, FaixaVento = vento, FaixaCalor = calor, Chuva3hMm = chuva3h, Timestamp = Agora },
                new LeituraClimatica { VentoKmH = 45, SensacaoTermica = 34, Timestamp = Agora }),
            Fuso = Sp,
            Previsao = Array.Empty<FaixaPrevisaoDto>(),
            AgoraUtc = agora ?? Agora,
        };

    private static Task<IReadOnlyList<NotificacaoPendente>> Avaliar(ContextoGatilho c) => new GatilhoAtencao().AvaliarAsync(c);

    [Fact]
    public async Task Moderado_GeraPendenciaOptInModeradoComPrioridadeMaisBaixa()
    {
        var c = Ctx(FaixaRisco.MODERADO, alag: FaixaRisco.MODERADO);

        var p = await Avaliar(c);

        p.Should().ContainSingle();
        p[0].Gatilho.Should().Be("atencao");
        p[0].Criterio.Should().Be(CriterioOptIn.RiscoModerado);
        p[0].Prioridade.Should().Be(4, "Atenção é o aviso menos urgente e menor número ganha");
        p[0].Cooldown.Should().BeNull("dedup pela chave do dia");
        p[0].Perigo.Should().Be(TipoPerigo.ALAGAMENTO);
        p[0].Chave.Should().Be($"atencao:{c.Subprefeitura.Id}:ALAGAMENTO:2026-10-07");
        p[0].Payload.Titulo.Should().Be("Atenção: chuva na Mooca");
        p[0].Payload.Corpo.Should().Be("Chuva de 6 mm nas últimas 3 horas.");
        p[0].Payload.Url.Should().Be("/app?regiao=mooca");
        p[0].Payload.Tag.Should().Be($"atencao-{c.Subprefeitura.Id}");
    }

    [Theory]
    [InlineData(FaixaRisco.BAIXO)]
    [InlineData(FaixaRisco.ALTO)]
    public async Task ForaDeModerado_NaoGera(FaixaRisco geral)
        => (await Avaliar(Ctx(geral, alag: FaixaRisco.MODERADO))).Should().BeEmpty();

    [Fact]
    public async Task DoisPerigosEmAtencao_UmaPendenciaPorPerigo()
    {
        var p = await Avaliar(Ctx(FaixaRisco.MODERADO, alag: FaixaRisco.MODERADO, calor: FaixaRisco.MODERADO));

        p.Select(x => x.Perigo).Should().BeEquivalentTo(new TipoPerigo?[] { TipoPerigo.ALAGAMENTO, TipoPerigo.CALOR });
        p.Single(x => x.Perigo == TipoPerigo.CALOR).Payload.Titulo.Should().Be("Atenção: calor na Mooca");
        p.Single(x => x.Perigo == TipoPerigo.CALOR).Payload.Corpo.Should().Be("Sensação térmica de 34 °C. Hidrate-se e evite sol forte.");
    }

    [Fact]
    public async Task Vento_TextoDeVento()
    {
        var p = await Avaliar(Ctx(FaixaRisco.MODERADO, vento: FaixaRisco.MODERADO, principal: TipoPerigo.VENTO));

        p[0].Payload.Titulo.Should().Be("Atenção: vento na Mooca");
        p[0].Payload.Corpo.Should().Be("Ventos de 45 km/h agora.");
    }

    [Fact]
    public async Task AlagamentoSemChuvaEm3h_TextoDeFallback()
        => (await Avaliar(Ctx(FaixaRisco.MODERADO, alag: FaixaRisco.MODERADO, chuva3h: 0)))[0]
            .Payload.Corpo.Should().Be("Condições de atenção para alagamento agora.");

    [Fact]
    public async Task ScoreAntigoSemComponentes_UsaOPerigoPrincipal()
    {
        // Score gravado antes do S1: componentes no default (BAIXO), geral em MODERADO.
        var p = await Avaliar(Ctx(FaixaRisco.MODERADO, principal: TipoPerigo.CALOR));

        p.Should().ContainSingle().Which.Perigo.Should().Be(TipoPerigo.CALOR);
    }

    [Fact]
    public async Task ChaveMudaComODiaLocal()
    {
        // 02:30 UTC do dia 8 ainda é dia 7 em SP (23h30).
        var p = await Avaliar(Ctx(FaixaRisco.MODERADO, alag: FaixaRisco.MODERADO, agora: new DateTime(2026, 10, 8, 2, 30, 0, DateTimeKind.Utc)));

        p[0].Chave.Should().EndWith(":2026-10-07");
    }
}
