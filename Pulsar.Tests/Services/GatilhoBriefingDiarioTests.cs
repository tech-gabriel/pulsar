using System.Globalization;
using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

/// <summary>
/// Dois fusos de propósito em todo este arquivo: uma implementação que fixasse
/// America/Sao_Paulo passaria em qualquer teste de um fuso só, e é justamente esse código
/// que quebra quando entrar a segunda cidade.
///
/// A aritmética abaixo foi conferida nesta máquina, instante a instante:
/// America/Sao_Paulo é UTC-3 o ano todo (o Brasil aboliu o horário de verão em 2019) e
/// Europe/Lisbon em agosto está em horário de verão, UTC+1. Por isso 08:00 UTC é 05:00 em
/// São Paulo e 09:00 em Lisboa: o mesmo instante cai em lados opostos das 6h locais.
/// </summary>
public class GatilhoBriefingDiarioTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    private static readonly TimeZoneInfo Lisboa = TimeZoneInfo.FindSystemTimeZoneById("Europe/Lisbon");

    /// <summary>09:00 UTC = 06:00 em São Paulo, o primeiro instante em que o briefing pode sair.</summary>
    private static readonly DateTime SeisDaManhaEmSp = new(2026, 8, 17, 9, 0, 0, DateTimeKind.Utc);

    private static ContextoGatilho Contexto(
        DateTime agoraUtc,
        TimeZoneInfo? fuso = null,
        FaixaRisco faixa = FaixaRisco.MODERADO,
        params FaixaPrevisaoDto[] previsao)
    {
        var tz = fuso ?? Sp;
        var regiao = new Regiao { Nome = "Sul", FusoHorario = tz.Id };

        return new ContextoGatilho
        {
            Regiao = regiao,
            Fuso = tz,
            Subprefeituras =
            [
                new EstadoSubprefeitura(
                    new Subprefeitura { RegiaoId = regiao.Id, Nome = "Sub", Ativa = true },
                    new ScorePerigo { Valor = 48, Faixa = faixa, Timestamp = agoraUtc },
                    new LeituraClimatica
                    {
                        ChuvaMmH = 1, VentoKmH = 12, VisibilidadeKm = 9, IndiceUv = 3,
                        TemperaturaC = 18, SensacaoTermica = 17, Umidade = 80, Timestamp = agoraUtc,
                    }),
            ],
            Previsao = previsao,
            AgoraUtc = agoraUtc,
        };
    }

    private static FaixaPrevisaoDto Faixa(DateTime instanteUtc, double chuva)
        => new()
        {
            InstantePrevisto = instanteUtc,
            ChuvaMm = chuva,
            ProbabilidadeChuva = 0.7,
            VentoKmH = 18,
            RajadaKmH = 25,
            TemperaturaC = 20,
            CondicaoCodigo = chuva > 0 ? 500 : 800,
            CondicaoDescricao = chuva > 0 ? "chuva leve" : "céu limpo",
            ColetadoEm = instanteUtc.AddHours(-1),
        };

    [Fact]
    public async Task AsSeisHorasLocais_Dispara()
    {
        var ctx = Contexto(SeisDaManhaEmSp);

        var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(ctx);

        pendencias.Should().HaveCount(1);
        pendencias[0].Gatilho.Should().Be("briefing-diario");

        // O critério é o que faz o toggle "Resumo diário" da tela de configurações deixar
        // de mentir: qualquer outro valor entregaria o briefing ao público errado.
        pendencias[0].Criterio.Should().Be(CriterioOptIn.ResumoDiario);

        // Literal e não a constante: comparar a constante consigo mesma passaria mesmo se
        // ela virasse 1, invertendo a ordem de que a Task 10 depende (score alto ganha de
        // chuva prevista, que ganha do briefing).
        pendencias[0].Prioridade.Should().Be(3, "o briefing é o que mais cede espaço");

        pendencias[0].Cooldown.Should().BeNull("o dedup do briefing é por chave do dia local");

        // Tag é carga: é ela que faz o briefing de hoje SUBSTITUIR o de ontem na bandeja
        // em vez de empilhar.
        pendencias[0].Payload.Tag.Should().Be($"briefing-{ctx.Regiao.Id}");
        pendencias[0].Payload.Url.Should().Be("/");
    }

    /// <summary>
    /// Fixa a fronteira das 6h locais nos dois lados, e não um intervalo: como a decisão é
    /// pela hora cheia local, 08:59 UTC (05:59 em SP) e 09:00 UTC (06:00 em SP) são os dois
    /// instantes vizinhos que a cercam. Sem o par, um gatilho que disparasse às 5h passaria.
    /// </summary>
    [Theory]
    [InlineData(4, 0, 0)]   // 01:00 em SP, madrugada
    [InlineData(8, 0, 0)]   // 05:00 em SP
    [InlineData(8, 59, 0)]  // 05:59 em SP, o último minuto em que ainda não sai
    [InlineData(9, 0, 1)]   // 06:00 em SP, o primeiro instante em que sai
    [InlineData(9, 1, 1)]   // 06:01 em SP
    [InlineData(23, 0, 1)]  // 20:00 em SP: passou das 6h e continua valendo o dia todo
    public async Task FronteiraDasSeisHorasLocais(int horaUtc, int minutoUtc, int esperado)
    {
        var instante = new DateTime(2026, 8, 17, horaUtc, minutoUtc, 0, DateTimeKind.Utc);

        var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(Contexto(instante));

        pendencias.Should().HaveCount(esperado,
            "{0:HH:mm} UTC é {1:HH:mm} em São Paulo",
            instante, TimeZoneInfo.ConvertTimeFromUtc(instante, Sp));
    }

    /// <summary>
    /// O teste que uma implementação com São Paulo fixo não consegue passar: o mesmo
    /// instante decide diferente em duas regiões porque o fuso vem de Regiao.FusoHorario.
    /// </summary>
    [Fact]
    public async Task MesmoInstante_FusosDiferentes_DecidemDiferente()
    {
        // 08:00 UTC: 05:00 em São Paulo (antes das 6h) e 09:00 em Lisboa (depois).
        var instante = new DateTime(2026, 8, 17, 8, 0, 0, DateTimeKind.Utc);
        var gatilho = new GatilhoBriefingDiario();

        (await gatilho.AvaliarAsync(Contexto(instante, Sp))).Should().BeEmpty(
            "em São Paulo ainda são 05:00");
        (await gatilho.AvaliarAsync(Contexto(instante, Lisboa))).Should().HaveCount(1,
            "em Lisboa já são 09:00, e o gatilho lê o fuso da região em vez de assumir SP");
    }

    /// <summary>
    /// O caso que separa dia local de dia UTC de verdade: 02:00 UTC do dia 18 ainda é o dia
    /// 17 em São Paulo, às 23h. Como 23h já passou das 6h, o briefing sai, e a chave tem que
    /// ser a do dia 17. Um gatilho que usasse ctx.AgoraUtc.Date escreveria 2026-08-18 aqui e
    /// gastaria a cota do dia seguinte antes de ele começar.
    /// </summary>
    [Fact]
    public async Task Chave_UsaODiaLocalENaoODiaUtc()
    {
        var ctx = Contexto(new DateTime(2026, 8, 18, 2, 0, 0, DateTimeKind.Utc));

        var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(ctx);

        pendencias[0].Chave.Should().Be($"briefing:{ctx.Regiao.Id}:2026-08-17",
            "23h do dia 17 em São Paulo é o briefing do dia 17");
    }

    /// <summary>
    /// A chave é o dedup: como Cooldown é null, o motor manda exatamente uma vez por chave.
    /// Uma chave por dia local é o que traduz "uma vez por dia" da tela de configurações.
    /// </summary>
    [Fact]
    public async Task Chave_MudaAoVirarODiaLocal()
    {
        var gatilho = new GatilhoBriefingDiario();
        var dia17 = new DateTime(2026, 8, 17, 12, 0, 0, DateTimeKind.Utc); // 09:00 local, dia 17
        var dia18 = new DateTime(2026, 8, 18, 12, 0, 0, DateTimeKind.Utc); // 09:00 local, dia 18

        // A MESMA região nos dois dias, de propósito: com duas regiões diferentes o Id já
        // separaria as chaves e o NotBe abaixo não poderia falhar, virando decoração.
        var regiao = new Regiao { Nome = "Sul", FusoHorario = Sp.Id };

        var a = await gatilho.AvaliarAsync(ComRegiao(regiao, dia17));
        var b = await gatilho.AvaliarAsync(ComRegiao(regiao, dia18));

        a[0].Chave.Should().Be($"briefing:{regiao.Id}:2026-08-17");
        b[0].Chave.Should().Be($"briefing:{regiao.Id}:2026-08-18");
        a[0].Chave.Should().NotBe(b[0].Chave, "dia novo é briefing novo");
    }

    /// <summary>
    /// Duas avaliações do mesmo dia local produzem a MESMA chave, que é o que faz o motor
    /// mandar um briefing só apesar de o ciclo de 15 min reavaliar a manhã inteira.
    /// </summary>
    [Fact]
    public async Task Chave_NaoMudaEntreCiclosDoMesmoDiaLocal()
    {
        var gatilho = new GatilhoBriefingDiario();
        var regiao = new Regiao { Nome = "Sul", FusoHorario = Sp.Id };

        var seisEmPonto = await gatilho.AvaliarAsync(ComRegiao(regiao, SeisDaManhaEmSp));
        var quinzeMinutosDepois = await gatilho.AvaliarAsync(
            ComRegiao(regiao, SeisDaManhaEmSp.AddMinutes(15)));

        quinzeMinutosDepois[0].Chave.Should().Be(seisEmPonto[0].Chave,
            "o ciclo reavalia a cada 15 min e a chave é o que impede o segundo envio");
    }

    [Fact]
    public async Task Chave_UsaCalendarioGregorianoIndependenteDoHost()
    {
        var ctx = Contexto(SeisDaManhaEmSp);

        // th-TH usa calendário budista: sem cultura invariante explícita no gatilho, o ano
        // sairia 2569 e a chave de hoje nunca casaria com os registros do livro-caixa.
        // O host de produção não define cultura, então isto não é hipotético.
        var original = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("th-TH");
        try
        {
            var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(ctx);

            pendencias[0].Chave.Should().Be($"briefing:{ctx.Regiao.Id}:2026-08-17",
                "a chave é texto de máquina e não pode variar com o locale");
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public async Task Copy_TrazORiscoAtualEAJanelaMaisChuvosaDas24h()
    {
        var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(Contexto(
            SeisDaManhaEmSp, Sp, FaixaRisco.MODERADO,
            Faixa(SeisDaManhaEmSp.AddHours(3), chuva: 2),    // 09h local
            Faixa(SeisDaManhaEmSp.AddHours(12), chuva: 14),  // 18h local, a mais chuvosa
            Faixa(SeisDaManhaEmSp.AddHours(30), chuva: 40))); // fora das 24h, deve ser ignorada

        var payload = pendencias[0].Payload;

        // CONVENÇÃO DESTE ARQUIVO (a mesma de GatilhoScoreAltoTests e GatilhoChuvaPrevistaTests):
        // toda guarda de regra ("não contém X") vem ANTES da igualdade exata da mesma string.
        // Depois dela seria inalcançável, porque a comparação exata falha primeiro e a guarda
        // viraria decoração. Nesta ordem cada guarda ainda erra dizendo QUAL regra foi quebrada.

        // Travessão é o caractere longo, não o hífen: hífen é legítimo em nome de região
        // ("Centro-Oeste"), então checar "-" proibiria copy correta.
        payload.Titulo.Should().NotContain("—", "copy visível não usa travessão");
        payload.Corpo.Should().NotContain("—", "copy visível não usa travessão");
        payload.Titulo.Should().NotContain("–", "nem o travessão curto");
        payload.Corpo.Should().NotContain("–", "nem o travessão curto");

        payload.Corpo.Should().NotContain("40",
            "faixa prevista para depois de 24h não entra no resumo do dia");
        payload.Corpo.Should().NotContain("faixa", "'faixa' é palavra do modelo, não de quem lê");

        payload.Titulo.Should().Be("Região Sul hoje");

        // Instrumento escolhido para o corpo: fragmentos exatos em vez de igualdade da
        // frase inteira. A cláusula da chuva é CONDICIONAL (some quando não há chuva
        // prevista), então uma igualdade do parágrafo todo passaria a fixar também a
        // emenda entre as duas partes, que é acidental. Os dois fragmentos abaixo cobrem
        // cada palavra que é decisão de produto, e o StartWith fixa a ordem.
        payload.Corpo.Should().StartWith("Risco moderado.",
            "o risco de agora abre o resumo, antes da previsão");
        payload.Corpo.Should().Contain("Chuva mais forte prevista para as 18h, 14 mm.",
            "a hora é a LOCAL da janela (18h em SP), não a UTC (21h), e o volume vem junto");
    }

    /// <summary>
    /// Fixa a janela de 24h dos dois lados. Só com o caso de 30h, uma janela de 26h passaria
    /// despercebida. As faixas do OpenWeatherMap são de 3 em 3 horas, mas o teste usa os
    /// instantes vizinhos da fronteira porque o que está sob teste é a comparação.
    /// </summary>
    [Theory]
    [InlineData(23, true)]
    [InlineData(24, true)]   // a fronteira é inclusiva
    [InlineData(25, false)]
    [InlineData(30, false)]
    public async Task JanelaDoResumo_SoOlhaAsProximas24Horas(int horasAFrente, bool esperaChuva)
    {
        var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(Contexto(
            SeisDaManhaEmSp, Sp, FaixaRisco.MODERADO,
            Faixa(SeisDaManhaEmSp.AddHours(horasAFrente), chuva: 14)));

        pendencias[0].Payload.Corpo.Contains("Chuva mais forte").Should().Be(esperaChuva,
            "chuva prevista para daqui a {0}h", horasAFrente);
    }

    [Fact]
    public async Task SemChuvaPrevista_CopyNaoInventaChuva()
    {
        var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(Contexto(
            SeisDaManhaEmSp, Sp, FaixaRisco.BAIXO,
            Faixa(SeisDaManhaEmSp.AddHours(3), chuva: 0),
            Faixa(SeisDaManhaEmSp.AddHours(6), chuva: 0)));

        var payload = pendencias[0].Payload;

        payload.Corpo.Should().NotContain("Chuva mais forte",
            "sem chuva prevista o resumo não pode inventar uma");
        payload.Corpo.Should().NotContain("—", "copy visível não usa travessão");
        payload.Corpo.Should().NotContain("–", "nem o travessão curto");

        // "hoje" seria precisão que não conferimos: o horizonte são 24h a partir de agora,
        // que às 6h locais passa da meia-noite e alcança a manhã seguinte.
        payload.Corpo.Should().NotContain("hoje",
            "o escopo conferido são as próximas 24h, não o dia de hoje");

        // Igualdade exata: este ramo é frase inteira escrita à mão, sem interpolação
        // nenhuma. Um Contain("baixo") passaria em corpo truncado, e é justamente o corpo
        // truncado ("Risco baixo." e mais nada) que este teste existe para impedir de voltar.
        payload.Corpo.Should().Be("Risco baixo. Sem chuva prevista nas próximas horas.");
    }

    [Fact]
    public async Task Copy_FormataDecimalComVirgulaIndependenteDoHost()
    {
        // O host não define cultura (nem o container de produção), então o teste força a
        // cultura ambiente para invariante: assim ele mede o que o gatilho declara, e não a
        // máquina em que roda, que aqui por acaso é pt-BR. Sem a cultura explícita no
        // código, sairia "12.4 mm" no meio de uma frase em português.
        var original = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        try
        {
            var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(Contexto(
                SeisDaManhaEmSp, Sp, FaixaRisco.MODERADO,
                Faixa(SeisDaManhaEmSp.AddHours(12), chuva: 12.4)));

            pendencias[0].Payload.Corpo.Should().Contain(
                "Chuva mais forte prevista para as 18h, 12,4 mm.",
                "número com ponto no meio de frase em português lê errado");
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public async Task SemPrevisaoNenhuma_AindaDisparaComOResumoDoRisco()
    {
        var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(Contexto(SeisDaManhaEmSp));

        pendencias.Should().HaveCount(1,
            "o briefing vale mesmo sem previsão: o risco atual já é conteúdo");

        // Guarda antes da igualdade: sem NENHUMA faixa olhada, não observamos ausência de
        // chuva, só ausência de previsão. Afirmar "sem chuva prevista" aqui seria inventar
        // uma ausência tanto quanto inventar a chuva, e é o erro fácil de cometer ao
        // transformar o "if" da cláusula em "if/else".
        pendencias[0].Payload.Corpo.Should().NotContain("Sem chuva",
            "sem previsão nenhuma não dá para afirmar que não vai chover");

        pendencias[0].Payload.Corpo.Should().Be("Risco moderado.");
    }

    /// <summary>
    /// Previsão existe, mas toda ela cai depois do horizonte do resumo. É o mesmo estado
    /// epistêmico de não ter previsão: nada foi olhado dentro da janela, então o resumo não
    /// pode afirmar nem chuva nem ausência de chuva.
    /// </summary>
    [Fact]
    public async Task PrevisaoSoDepoisDoHorizonte_NaoAfirmaChuvaNemAusencia()
    {
        var pendencias = await new GatilhoBriefingDiario().AvaliarAsync(Contexto(
            SeisDaManhaEmSp, Sp, FaixaRisco.MODERADO,
            Faixa(SeisDaManhaEmSp.AddHours(30), chuva: 0),
            Faixa(SeisDaManhaEmSp.AddHours(36), chuva: 8)));

        pendencias[0].Payload.Corpo.Should().NotContain("Chuva mais forte");
        pendencias[0].Payload.Corpo.Should().NotContain("Sem chuva");
        pendencias[0].Payload.Corpo.Should().Be("Risco moderado.");
    }

    [Fact]
    public async Task SemScoreNenhum_NaoDispara()
    {
        var ctx = new ContextoGatilho
        {
            Regiao = new Regiao { Nome = "Sul", FusoHorario = Sp.Id },
            Fuso = Sp,
            Subprefeituras = Array.Empty<EstadoSubprefeitura>(),
            Previsao = Array.Empty<FaixaPrevisaoDto>(),
            AgoraUtc = SeisDaManhaEmSp,
        };

        (await new GatilhoBriefingDiario().AvaliarAsync(ctx)).Should().BeEmpty(
            "sem dado nenhum o resumo seria uma notificação vazia");
    }

    /// <summary>Mesma região (mesmo Id) em dois instantes, para comparar chaves entre ciclos.</summary>
    private static ContextoGatilho ComRegiao(Regiao regiao, DateTime agoraUtc)
        => new()
        {
            Regiao = regiao,
            Fuso = TimeZoneInfo.FindSystemTimeZoneById(regiao.FusoHorario),
            Subprefeituras =
            [
                new EstadoSubprefeitura(
                    new Subprefeitura { RegiaoId = regiao.Id, Nome = "Sub", Ativa = true },
                    new ScorePerigo { Valor = 48, Faixa = FaixaRisco.MODERADO, Timestamp = agoraUtc },
                    null),
            ],
            Previsao = Array.Empty<FaixaPrevisaoDto>(),
            AgoraUtc = agoraUtc,
        };
}
