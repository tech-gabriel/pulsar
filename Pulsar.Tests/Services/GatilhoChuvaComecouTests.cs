using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class GatilhoChuvaComecouTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    private static readonly DateTime Agora = new(2026, 11, 9, 18, 0, 0, DateTimeKind.Utc);
    private static readonly Subprefeitura Sub = new() { Nome = "Butantã", Ativa = true };

    private static LeituraClimatica Leitura(int minutosAtras, double mmH)
        => new() { SubprefeituraId = Sub.Id, ChuvaMmH = mmH, Timestamp = Agora.AddMinutes(-minutosAtras) };

    /// <summary>Open-Meteo com <paramref name="mm"/> na hora da leitura e seco no resto.</summary>
    private static Dictionary<DateTime, double> Referencia(double mm, int horaComChuva = 0)
        => Enumerable.Range(-6, 13).ToDictionary(h => Agora.AddHours(h), h => h == horaComChuva ? mm : 0.0);

    private static ContextoGatilho Contexto(IReadOnlyDictionary<DateTime, double>? referencia, params LeituraClimatica[] leituras)
        => new()
        {
            Estado = new EstadoSubprefeitura(Sub, null, leituras.Last()),
            Fuso = Sp,
            Previsao = [],
            AgoraUtc = Agora,
            LeiturasRecentes = leituras,
            ChuvaReferencia = referencia,
        };

    private static Task<IReadOnlyList<NotificacaoPendente>> Avaliar(ContextoGatilho ctx)
        => new GatilhoChuvaComecou().AvaliarAsync(ctx);

    [Fact]
    public async Task SecaParaChuva_ComConfirmacao_Avisa()
    {
        var p = await Avaliar(Contexto(Referencia(0.3), Leitura(30, 0), Leitura(15, 0), Leitura(0, 1.2)));

        p.Should().HaveCount(1);
        p[0].Gatilho.Should().Be("chuva-comecou");
        p[0].Intensidade.Should().Be("fraca");
        p[0].Chave.Should().Be($"chuva-comecou:{Sub.Id}:202611091800");
        p[0].Criterio.Should().Be(CriterioOptIn.ChuvaLocais);
        p[0].Cooldown.Should().Be(TimeSpan.FromHours(3));
        p[0].Prioridade.Should().Be(4, "abaixo da chuva medida por perto (3), acima do briefing");
        p[0].SubprefeituraId.Should().Be(Sub.Id);
        p[0].Local.Should().Be("Butantã");
        p[0].Payload.Tag.Should().Be("chuva-comecou");
    }

    [Fact]
    public async Task ChuvaHaMaisDeUmaHora_NaoAvisa()
        => (await Avaliar(Contexto(Referencia(0.3), Leitura(75, 1), Leitura(60, 1), Leitura(45, 1), Leitura(30, 1), Leitura(15, 1), Leitura(0, 1))))
            .Should().BeEmpty();

    [Fact]
    public async Task SegundoCicloDoMesmoEpisodio_MesmaChave()
    {
        var p = await Avaliar(Contexto(Referencia(0.3), Leitura(30, 0), Leitura(15, 1.0), Leitura(0, 3.0)));

        p.Should().HaveCount(1);
        p[0].Chave.Should().Be($"chuva-comecou:{Sub.Id}:202611091745", "a chave é o início do episódio");
        p[0].Intensidade.Should().Be("moderada");
    }

    [Fact]
    public async Task Garoa_AbaixoDoLimiar_NaoAvisa()
        => (await Avaliar(Contexto(Referencia(0.3), Leitura(15, 0), Leitura(0, 0.4)))).Should().BeEmpty();

    [Fact]
    public async Task SemOpenMeteo_NaoAvisa()
        => (await Avaliar(Contexto(null, Leitura(15, 0), Leitura(0, 5)))).Should().BeEmpty();

    [Fact]
    public async Task OpenMeteoSeco_NaJanela_NaoAvisa()
        => (await Avaliar(Contexto(Referencia(5.0, horaComChuva: 3), Leitura(15, 0), Leitura(0, 5)))).Should().BeEmpty();

    [Fact]
    public async Task OpenMeteoComChuvaDuasHorasAntes_Avisa()
        => (await Avaliar(Contexto(Referencia(0.1, horaComChuva: -2), Leitura(15, 0), Leitura(0, 5)))).Should().HaveCount(1);

    [Fact]
    public async Task ColetorParado_SemLeituraSecaRecente_NaoAvisa()
        => (await Avaliar(Contexto(Referencia(0.3), Leitura(90, 0), Leitura(0, 2.0)))).Should().BeEmpty();

    [Fact]
    public async Task LeituraAtualVelha_NaoAvisa()
    {
        // OWM fora há 40 min, o motor seguiu rodando: "chovendo agora" seria de 40 min atrás.
        var ctx = Contexto(Referencia(0.3), Leitura(70, 0), Leitura(55, 0), Leitura(40, 2.0));
        (await Avaliar(ctx)).Should().BeEmpty();
    }

    [Theory]
    [InlineData(0.49, null)]
    [InlineData(0.5, "fraca")]
    [InlineData(2.49, "fraca")]
    [InlineData(2.5, "moderada")]
    [InlineData(9.99, "moderada")]
    [InlineData(10, "forte")]
    public void Intensidade_Faixas(double mmH, string? esperado)
        => GatilhoChuvaComecou.Intensidade(mmH).Should().Be(esperado);

    // ── Posto do CGE como confirmação alternativa (AS7) ──

    private static ContextoGatilho ComMedida(ContextoGatilho ctx, double? mm30, bool vizinho = false)
        => new()
        {
            Estado = ctx.Estado, Fuso = ctx.Fuso, Previsao = ctx.Previsao, AgoraUtc = ctx.AgoraUtc,
            LeiturasRecentes = ctx.LeiturasRecentes, ChuvaReferencia = ctx.ChuvaReferencia,
            ChuvaMedida = new ChuvaMedidaRegiao(Sub.Id, 1000842, "Butantã", vizinho, mm30, mm30, null, 5.0, Agora),
        };

    [Fact]
    public async Task OpenMeteoNaoConfirmaMasPostoProprioMediu_Avisa()
    {
        var p = await Avaliar(ComMedida(Contexto(null, Leitura(30, 0), Leitura(15, 0), Leitura(0, 1.2)), 2.0));

        p.Should().HaveCount(1);
        p[0].MedidoMm30.Should().Be(2.0);
    }

    [Fact]
    public async Task OpenMeteoNaoConfirmaEMedicaoEDeVizinho_NaoAvisa()
        => (await Avaliar(ComMedida(Contexto(null, Leitura(30, 0), Leitura(15, 0), Leitura(0, 1.2)), 2.0, vizinho: true)))
            .Should().BeEmpty();

    [Fact]
    public async Task OpenMeteoNaoConfirmaEPostoMediuQuaseNada_NaoAvisa()
        => (await Avaliar(ComMedida(Contexto(null, Leitura(30, 0), Leitura(15, 0), Leitura(0, 1.2)), 0.2)))
            .Should().BeEmpty();

    [Fact]
    public async Task OpenMeteoConfirmaSemMedicao_ContinuaComoAntes()
    {
        var p = await Avaliar(Contexto(Referencia(0.3), Leitura(30, 0), Leitura(15, 0), Leitura(0, 1.2)));

        p.Should().HaveCount(1);
        p[0].MedidoMm30.Should().BeNull();
    }

    [Fact]
    public async Task OpenMeteoConfirmaEPostoMediuZero_NaoLevaMedicao()
    {
        var p = await Avaliar(ComMedida(Contexto(Referencia(0.3), Leitura(30, 0), Leitura(15, 0), Leitura(0, 1.2)), 0.0));

        p.Should().HaveCount(1);
        p[0].MedidoMm30.Should().BeNull("dizer que o CGE mediu 0 mm contradiz o próprio aviso");
    }
}
