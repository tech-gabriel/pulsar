using System.Globalization;
using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class GatilhoChuvaPrevistaTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    /// <summary>15:00 UTC é meio-dia em São Paulo (UTC-3 o ano todo desde 2019).</summary>
    private static readonly DateTime Agora = new(2026, 8, 17, 15, 0, 0, DateTimeKind.Utc);

    private static FaixaPrevisaoDto Faixa(double horasAFrente, double chuva, double pop)
        => new()
        {
            InstantePrevisto = Agora.AddHours(horasAFrente),
            ChuvaMm = chuva,
            ProbabilidadeChuva = pop,
            VentoKmH = 20,
            RajadaKmH = 30,
            TemperaturaC = 19,
            CondicaoCodigo = 502,
            CondicaoDescricao = "chuva forte",
            ColetadoEm = Agora,
        };

    private static ContextoGatilho Contexto(params FaixaPrevisaoDto[] faixas)
        => new()
        {
            Regiao = new Regiao { Nome = "Sul", FusoHorario = "America/Sao_Paulo" },
            Fuso = Sp,
            Subprefeituras = Array.Empty<EstadoSubprefeitura>(),
            Previsao = faixas,
            AgoraUtc = Agora,
        };

    [Fact]
    public async Task ChuvaAcimaDoLimiarComProbabilidadeAlta_Dispara()
    {
        var ctx = Contexto(Faixa(3, chuva: 14, pop: 0.82));

        var pendencias = await new GatilhoChuvaPrevista().AvaliarAsync(ctx);

        pendencias.Should().HaveCount(1);
        pendencias[0].Gatilho.Should().Be("chuva-prevista");

        // Literal e não a constante: comparar a constante consigo mesma passaria mesmo se
        // ela virasse 1, invertendo a ordem de que a Task 10 depende (score alto ganha de
        // chuva prevista, que ganha do briefing).
        pendencias[0].Prioridade.Should().Be(2,
            "chuva prevista perde para risco alto acontecendo agora e ganha do briefing");

        pendencias[0].Cooldown.Should().BeNull("o dedup da chuva é por chave exata da faixa");

        // Tag é carga: é ela que faz o aviso novo SUBSTITUIR o anterior na bandeja em vez
        // de empilhar dois avisos da mesma região.
        pendencias[0].Payload.Tag.Should().Be($"chuva-{ctx.Regiao.Id}");
        pendencias[0].Payload.Url.Should().Be("/");
    }

    [Fact]
    public async Task ChuvaExatamenteNosDoisLimiares_Dispara()
    {
        var pendencias = await new GatilhoChuvaPrevista()
            .AvaliarAsync(Contexto(Faixa(3, chuva: 10, pop: 0.6)));

        pendencias.Should().HaveCount(1, "o limiar é inclusivo nas duas condições");
    }

    /// <summary>
    /// As duas condições valem JUNTAS. Cada par traz o caso realista e o valor logo abaixo
    /// do limiar, para o teste fixar a fronteira em vez de só provar que ela existe em
    /// algum lugar do intervalo.
    /// </summary>
    [Theory]
    [InlineData(9.9, 0.95)]   // volume logo abaixo dos 10 mm
    [InlineData(8.0, 0.95)]   // 8 mm em 3h é garoa, não evento
    [InlineData(25.0, 0.59)]  // probabilidade logo abaixo dos 0,6
    [InlineData(25.0, 0.4)]   // chuva forte, mas improvável demais para acordar alguém
    public async Task VolumeOuProbabilidadeAbaixoDoLimiar_NaoDispara(double chuva, double pop)
    {
        var pendencias = await new GatilhoChuvaPrevista()
            .AvaliarAsync(Contexto(Faixa(3, chuva, pop)));

        pendencias.Should().BeEmpty(
            "{0} mm com probabilidade {1} não passa nas duas condições", chuva, pop);
    }

    /// <summary>
    /// Lookahead de 12h, inclusivo. O caso de 13h existe para fixar a fronteira: só com o
    /// de 15h, uma janela de 14h passaria despercebida.
    /// </summary>
    [Theory]
    [InlineData(11, 1)]
    [InlineData(12, 1)]
    [InlineData(13, 0)]
    [InlineData(15, 0)]
    public async Task JanelaDeLookahead_SoOlhaAsProximas12Horas(int horasAFrente, int esperado)
    {
        var pendencias = await new GatilhoChuvaPrevista()
            .AvaliarAsync(Contexto(Faixa(horasAFrente, chuva: 30, pop: 0.9)));

        pendencias.Should().HaveCount(esperado,
            "chuva prevista para daqui a {0}h", horasAFrente);
    }

    [Fact]
    public async Task MaisDeUmaFaixaQualificada_AvisaSoADaPrimeiraOcorrencia()
    {
        var pendencias = await new GatilhoChuvaPrevista().AvaliarAsync(Contexto(
            Faixa(3, chuva: 12, pop: 0.7),
            Faixa(6, chuva: 30, pop: 0.9)));

        pendencias.Should().HaveCount(1);
        pendencias[0].Chave.Should().Contain(
            Agora.AddHours(3).ToString("yyyyMMddHHmm", CultureInfo.InvariantCulture),
            "avisa da chuva que chega primeiro, não da mais intensa");
    }

    /// <summary>
    /// A severidade divide o público do opt-in: quem só assinou risco alto recebe o
    /// temporal e não a chuva meramente forte. Os 19,9 fixam a fronteira nos 20 mm.
    /// </summary>
    [Theory]
    [InlineData(45.0, CriterioOptIn.RiscoAlto)]
    [InlineData(20.0, CriterioOptIn.RiscoAlto)]
    [InlineData(19.9, CriterioOptIn.RiscoModerado)]
    [InlineData(14.0, CriterioOptIn.RiscoModerado)]
    public async Task Severidade_SegueOLimiarDeChuvaMuitoForte(double chuva, CriterioOptIn esperado)
    {
        var pendencias = await new GatilhoChuvaPrevista()
            .AvaliarAsync(Contexto(Faixa(3, chuva, pop: 0.9)));

        pendencias[0].Criterio.Should().Be(esperado, "{0} mm previstos", chuva);
    }

    [Fact]
    public async Task ChaveMudaComAFaixaPrevista()
    {
        var umaFaixa = await new GatilhoChuvaPrevista().AvaliarAsync(Contexto(Faixa(3, 14, 0.8)));
        var outraFaixa = await new GatilhoChuvaPrevista().AvaliarAsync(Contexto(Faixa(6, 14, 0.8)));

        umaFaixa[0].Chave.Should().NotBe(outraFaixa[0].Chave,
            "previsão que muda de horário é informação nova e merece um segundo aviso");
    }

    [Fact]
    public async Task Chave_UsaCalendarioGregorianoIndependenteDoHost()
    {
        var ctx = Contexto(Faixa(3, chuva: 14, pop: 0.82));

        // th-TH usa calendário budista: sem cultura invariante explícita no gatilho, o ano
        // sairia 2569 e a chave de hoje nunca casaria com os registros antigos do
        // livro-caixa. O host de produção não define cultura, então isto não é hipotético.
        var original = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("th-TH");
        try
        {
            var pendencias = await new GatilhoChuvaPrevista().AvaliarAsync(ctx);

            pendencias[0].Chave.Should().Be($"chuva:{ctx.Regiao.Id}:202608171800",
                "a chave é texto de máquina e não pode variar com o locale");
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public async Task SemPrevisao_NaoDispara()
    {
        (await new GatilhoChuvaPrevista().AvaliarAsync(Contexto())).Should().BeEmpty();
    }

    [Fact]
    public async Task Copy_DizAHoraLocalENaoUsaTravessao()
    {
        // Faixa(3) é 18:00 UTC, que em America/Sao_Paulo (UTC-3) é 15:00 local. O "15h" da
        // copy é o horário LOCAL DA FAIXA, não o do Agora (12:00 local).
        var pendencias = await new GatilhoChuvaPrevista()
            .AvaliarAsync(Contexto(Faixa(3, chuva: 14, pop: 0.82)));

        var payload = pendencias[0].Payload;

        // CONVENÇÃO DESTE ARQUIVO (a mesma de GatilhoScoreAltoTests): toda guarda de regra
        // ("não contém X") vem ANTES da igualdade exata da mesma string. Depois dela seria
        // inalcançável, porque a comparação exata falha primeiro e a guarda viraria
        // decoração. Nesta ordem cada guarda ainda erra dizendo QUAL regra foi quebrada.

        // Travessão é o caractere longo, não o hífen: hífen é legítimo em nome de região
        // ("Centro-Oeste"), então checar "-" proibiria copy correta.
        payload.Titulo.Should().NotContain("—", "copy visível não usa travessão");
        payload.Corpo.Should().NotContain("—", "copy visível não usa travessão");
        payload.Titulo.Should().NotContain("–", "nem o travessão curto");
        payload.Corpo.Should().NotContain("–", "nem o travessão curto");

        payload.Titulo.Should().Be("Chuva forte prevista na região Sul");

        // Igualdade exata: um Contain("15h") passaria em corpo que perdeu o volume ou a
        // orientação do que fazer, e cada palavra aqui é decisão de produto.
        payload.Corpo.Should().Be(
            "14 mm previstos para a faixa das 15h. Se puder, antecipe a saída.");
    }

    [Fact]
    public async Task Copy_FormataDecimalComVirgulaIndependenteDoHost()
    {
        // O host não define cultura (nem o container de produção), então o teste força a
        // cultura ambiente para invariante: assim ele mede o que o gatilho declara, e não a
        // máquina em que roda. Sem a cultura explícita no código, sairia "12.4 mm" no meio
        // de uma frase em português, e push é onde o leitor não volta para conferir.
        var original = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        try
        {
            var pendencias = await new GatilhoChuvaPrevista()
                .AvaliarAsync(Contexto(Faixa(3, chuva: 12.4, pop: 0.82)));

            pendencias[0].Payload.Corpo.Should().Be(
                "12,4 mm previstos para a faixa das 15h. Se puder, antecipe a saída.",
                "número com ponto no meio de frase em português lê errado");
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }
}
