using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;

namespace Pulsar.Tests.Domain;

public class ScoreDtoTests
{
    [Fact]
    public void De_MapeiaPrincipalComponentesEAcumulados()
    {
        var s = new ScorePerigo
        {
            Valor = 72.345, Faixa = FaixaRisco.ALTO, PerigoPrincipal = TipoPerigo.CALOR,
            ValorAlagamento = 10, FaixaAlagamento = FaixaRisco.BAIXO,
            ValorVento = 20, FaixaVento = FaixaRisco.BAIXO,
            ValorCalor = 72.345, FaixaCalor = FaixaRisco.ALTO,
            Chuva3hMm = 1.26, Chuva48hMm = 30.44, Timestamp = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
        };

        var dto = ScoreDto.De(s);

        dto.Valor.Should().Be(72.3);
        dto.PerigoPrincipal.Should().Be(TipoPerigo.CALOR);
        dto.Componentes.Calor.Faixa.Should().Be(FaixaRisco.ALTO);
        dto.Componentes.Alagamento.Valor.Should().Be(10);
        dto.Chuva3hMm.Should().Be(1.3);
        dto.Chuva48hMm.Should().Be(30.4);
    }

    [Fact]
    public void De_ScoreAntigoSemColunas_ViraComponentesZeradosEAlagamento()
    {
        // Linhas gravadas antes da migration: colunas novas ficam no default (0).
        var dto = ScoreDto.De(new ScorePerigo { Valor = 40, Faixa = FaixaRisco.MODERADO });

        dto.PerigoPrincipal.Should().Be(TipoPerigo.ALAGAMENTO);
        dto.Componentes.Alagamento.Valor.Should().Be(0);
        dto.Valor.Should().Be(40, "o principal antigo continua valendo");
    }

    [Fact]
    public void Regiao_PerigoAgregado_EhODaPiorSubprefeitura()
    {
        var regiao = new Regiao();
        regiao.Subprefeituras.Add(new Subprefeitura { Ativa = true, Scores = [new ScorePerigo { Valor = 30, PerigoPrincipal = TipoPerigo.ALAGAMENTO, Timestamp = DateTime.UtcNow }] });
        regiao.Subprefeituras.Add(new Subprefeitura { Ativa = true, Scores = [new ScorePerigo { Valor = 70, PerigoPrincipal = TipoPerigo.VENTO, Timestamp = DateTime.UtcNow }] });

        regiao.GetPerigoPrincipalAgregado().Should().Be(TipoPerigo.VENTO);
    }

    [Fact]
    public void Regiao_SemScores_PerigoAgregadoEhAlagamento()
        => new Regiao().GetPerigoPrincipalAgregado().Should().Be(TipoPerigo.ALAGAMENTO);
}
