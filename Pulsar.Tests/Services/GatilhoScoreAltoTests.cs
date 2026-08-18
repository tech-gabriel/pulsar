using System.Globalization;
using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class GatilhoScoreAltoTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    private static LeituraClimatica LeituraPadrao() => new()
    {
        ChuvaMmH = 18.0,
        VentoKmH = 45.0,
        VisibilidadeKm = 4,
        IndiceUv = 2,
        TemperaturaC = 19,
        SensacaoTermica = 18,
        Umidade = 92,
        Timestamp = DateTime.UtcNow,
    };

    private static ContextoGatilho Contexto(params (double valor, FaixaRisco faixa)[] scores)
        => Montar(LeituraPadrao(), scores);

    /// <summary>Mesmo cenário, mas sem a leitura que gerou o score: cobre a copy de fallback.</summary>
    private static ContextoGatilho ContextoSemLeitura(params (double valor, FaixaRisco faixa)[] scores)
        => Montar(null, scores);

    private static ContextoGatilho Montar(
        LeituraClimatica? leitura, (double valor, FaixaRisco faixa)[] scores)
    {
        var regiao = new Regiao { Nome = "Sul", FusoHorario = "America/Sao_Paulo" };
        var estados = scores.Select(s => new EstadoSubprefeitura(
            new Subprefeitura { RegiaoId = regiao.Id, Nome = "Sub", Ativa = true },
            new ScorePerigo { Valor = s.valor, Faixa = s.faixa, Timestamp = DateTime.UtcNow },
            leitura)).ToList();

        return new ContextoGatilho
        {
            Regiao = regiao,
            Fuso = Sp,
            Subprefeituras = estados,
            Previsao = Array.Empty<FaixaPrevisaoDto>(),
            AgoraUtc = new DateTime(2026, 8, 17, 18, 0, 0, DateTimeKind.Utc),
        };
    }

    [Fact]
    public async Task FaixaAlto_GeraPendencia()
    {
        var pendencias = await new GatilhoScoreAlto().AvaliarAsync(
            Contexto((45, FaixaRisco.MODERADO), (78, FaixaRisco.ALTO)));

        pendencias.Should().HaveCount(1);
        pendencias[0].Gatilho.Should().Be("score-alto");
        pendencias[0].Criterio.Should().Be(CriterioOptIn.RiscoAlto);
        pendencias[0].Prioridade.Should().Be(LimiaresNotificacao.PrioridadeScoreAlto);
    }

    [Fact]
    public async Task FaixaAlto_UsaCooldownDeslizanteDeUmaHora()
    {
        var pendencias = await new GatilhoScoreAlto().AvaliarAsync(Contexto((78, FaixaRisco.ALTO)));

        pendencias[0].Cooldown.Should().Be(TimeSpan.FromHours(1),
            "o dedup do score alto é janela deslizante, não balde de hora de calendário");
    }

    [Fact]
    public async Task SemFaixaAlto_NaoGeraNada()
    {
        var pendencias = await new GatilhoScoreAlto().AvaliarAsync(
            Contexto((25, FaixaRisco.BAIXO), (55, FaixaRisco.MODERADO)));

        pendencias.Should().BeEmpty();
    }

    [Fact]
    public async Task SemScoreNenhum_NaoGeraNada()
    {
        var ctx = new ContextoGatilho
        {
            Regiao = new Regiao { Nome = "Sul", FusoHorario = "America/Sao_Paulo" },
            Fuso = Sp,
            Subprefeituras = Array.Empty<EstadoSubprefeitura>(),
            Previsao = Array.Empty<FaixaPrevisaoDto>(),
            AgoraUtc = DateTime.UtcNow,
        };

        (await new GatilhoScoreAlto().AvaliarAsync(ctx)).Should().BeEmpty();
    }

    [Fact]
    public async Task Copy_TrazNumerosConcretosEmVezDeScore()
    {
        var pendencias = await new GatilhoScoreAlto().AvaliarAsync(Contexto((78, FaixaRisco.ALTO)));

        var payload = pendencias[0].Payload;
        payload.Titulo.Should().Be("Risco alto na região Sul");
        payload.Corpo.Should().Contain("18");
        payload.Corpo.Should().Contain("45");
        payload.Corpo.Should().NotContain("Score",
            "o número do score não diz a ninguém o que fazer");

        // Travessão é o caractere longo, não o hífen: hífen é legítimo em nome de
        // região ("Centro-Oeste"), então checar "-" proibiria copy correta.
        payload.Titulo.Should().NotContain("—", "copy visível não usa travessão");
        payload.Corpo.Should().NotContain("—", "copy visível não usa travessão");
        payload.Titulo.Should().NotContain("–", "nem o travessão curto");
        payload.Corpo.Should().NotContain("–", "nem o travessão curto");
    }

    [Fact]
    public async Task Copy_FormataDecimalComVirgulaIndependenteDoHost()
    {
        var leitura = LeituraPadrao();
        leitura.ChuvaMmH = 12.4;
        leitura.VentoKmH = 33.6;

        // O host não define cultura (nem o container de produção), então o teste força
        // a cultura ambiente para invariante: assim ele mede o que o gatilho declara,
        // e não a máquina em que roda. Sem a cultura explícita no código, o corpo sairia
        // "12.4" aqui e o teste falharia, inclusive numa máquina pt-BR.
        var original = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        try
        {
            var pendencias = await new GatilhoScoreAlto().AvaliarAsync(
                Montar(leitura, [(78, FaixaRisco.ALTO)]));

            pendencias[0].Payload.Corpo.Should().Be(
                "Chuva de 12,4 mm por hora e vento de 33,6 km/h agora.",
                "número com ponto no meio de frase em português lê errado");
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public async Task SemLeitura_UsaCopyGenericaEmVezDeNumeros()
    {
        var pendencias = await new GatilhoScoreAlto().AvaliarAsync(
            ContextoSemLeitura((78, FaixaRisco.ALTO)));

        pendencias.Should().HaveCount(1, "score alto sem leitura ainda merece aviso");
        pendencias[0].Payload.Corpo.Should().Be(
            "Condições de risco alto agora. Evite áreas de alagamento.");
    }
}
