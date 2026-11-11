using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class GatilhoChuvaMedidaPertoTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    private static readonly DateTime Agora = new(2026, 11, 10, 18, 20, 0, DateTimeKind.Utc);
    private static readonly Subprefeitura Sub = new() { Nome = "Pinheiros", Ativa = true };

    private static ChuvaMedidaRegiao Medida(double? mm30, bool vizinho = false)
        => new(Guid.NewGuid(), 1, "Posto", vizinho, mm30, mm30, null, 20.0, Agora);

    private static ContextoGatilho Ctx(ChuvaMedidaRegiao? propria, params (string Nome, double Km, double Mm30)[] perto)
        => new()
        {
            Estado = new EstadoSubprefeitura(Sub, null, null),
            Fuso = Sp,
            Previsao = [],
            AgoraUtc = Agora,
            ChuvaMedida = propria,
            ChuvaMedidaPerto = [.. perto.Select(p => new MedicaoPerto(p.Nome, p.Km, Medida(p.Mm30)))],
        };

    private static Task<IReadOnlyList<NotificacaoPendente>> Avaliar(ContextoGatilho ctx)
        => new GatilhoChuvaMedidaPerto().AvaliarAsync(ctx);

    [Fact]
    public async Task Avaliar_CeuLimpoAquiEChuvaForteAoLado_AvisaComOFatoMedido()
    {
        var p = await Avaliar(Ctx(Medida(0.0), ("Butantã", 5.0, 18.0)));

        p.Should().HaveCount(1);
        p[0].Gatilho.Should().Be("chuva-medida-perto");
        p[0].LocalMedicao.Should().Be("Butantã");
        p[0].MedidoMm30.Should().Be(18.0);
        p[0].Criterio.Should().Be(CriterioOptIn.ChuvaLocais);
        p[0].Cooldown.Should().Be(TimeSpan.FromHours(3));
        p[0].Prioridade.Should().Be(3, "abaixo da chuva prevista (2), acima do começou a chover (4)");
        p[0].SubprefeituraId.Should().Be(Sub.Id);
        p[0].Local.Should().Be("Pinheiros");
        p[0].Chave.Should().Be($"chuva-medida-perto:{Sub.Id}:2026111018");
        p[0].Payload.Titulo.Should().Be("Chove forte no Butantã agora");
        p[0].Payload.Corpo.Should().Be("O CGE mediu 18 mm em 30 minutos. Toque para ver no mapa.");
        p[0].Payload.Tag.Should().Be("chuva-medida-perto");
    }

    [Fact]
    public async Task Avaliar_ChuvaAoLadoAbaixoDoLimiar_NaoAvisa()
        => (await Avaliar(Ctx(Medida(0.0), ("Butantã", 5.0, 9.9)))).Should().BeEmpty();

    [Fact]
    public async Task Avaliar_JaChoveForteAqui_NaoAvisa()
        => (await Avaliar(Ctx(Medida(12.0), ("Butantã", 5.0, 18.0)))).Should().BeEmpty();

    [Fact]
    public async Task Avaliar_SemMedicaoNenhuma_NaoAvisa()
        => (await Avaliar(Ctx(null))).Should().BeEmpty();

    [Fact]
    public async Task Avaliar_SemMedicaoPropriaMasVizinhoForte_Avisa()
        => (await Avaliar(Ctx(null, ("Butantã", 5.0, 18.0)))).Should().HaveCount(1);

    [Fact]
    public async Task Avaliar_DoisVizinhosFortes_EscolheOMaior()
    {
        var p = await Avaliar(Ctx(Medida(0.0), ("Lapa", 3.0, 11.0), ("Butantã", 6.0, 25.4)));

        p.Should().HaveCount(1);
        p[0].LocalMedicao.Should().Be("Butantã");
        p[0].Payload.Corpo.Should().StartWith("O CGE mediu 25,4 mm em 30 minutos.");
    }

    [Fact]
    public async Task Avaliar_PropriaVemDeVizinho_AindaAvisa()
        => (await Avaliar(Ctx(Medida(15.0, vizinho: true), ("Butantã", 5.0, 15.0)))).Should().HaveCount(1);

    [Fact]
    public async Task Avaliar_VizinhoSemJanelaDe30Minutos_NaoAvisa()
    {
        var ctx = Ctx(Medida(0.0));
        var semJanela = new ContextoGatilho
        {
            Estado = ctx.Estado, Fuso = ctx.Fuso, Previsao = ctx.Previsao, AgoraUtc = ctx.AgoraUtc, ChuvaMedida = ctx.ChuvaMedida,
            ChuvaMedidaPerto = [new MedicaoPerto("Butantã", 5.0, Medida(null))],
        };

        (await Avaliar(semJanela)).Should().BeEmpty();
    }
}
