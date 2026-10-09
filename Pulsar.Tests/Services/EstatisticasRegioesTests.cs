using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class EstatisticasRegioesTests
{
    private static readonly DateOnly Hoje = new(2026, 10, 13);
    private static readonly Regiao Leste = new() { Nome = "Leste" };
    private static readonly Regiao Centro = new() { Nome = "Centro" };
    private static readonly Subprefeitura Mooca = new() { Nome = "Mooca", Regiao = Leste };
    private static readonly Subprefeitura Penha = new() { Nome = "Penha", Regiao = Leste };
    private static readonly Subprefeitura Se = new() { Nome = "Sé", Regiao = Centro };

    private static AgregadoDiario Linha(Subprefeitura sub, int diasAtras, double chuva = 0,
        int count = 96, int baixo = 96, int moderado = 0, int alto = 0)
        => new()
        {
            SubprefeituraId = sub.Id,
            Dia = Hoje.AddDays(-diasAtras),
            ChuvaTotalMm = chuva,
            LeiturasCount = count,
            LeiturasBaixo = baixo,
            LeiturasModerado = moderado,
            LeiturasAlto = alto,
        };

    private static EstatisticasRegioesDto Calcular(params AgregadoDiario[] linhas)
        => EstatisticasRegioes.Calcular([Mooca, Penha, Se], linhas, Hoje);

    [Fact]
    public void ChavesSaoOsSlugsDasPaginas_ComNuloSemDado()
    {
        var r = Calcular(Linha(Mooca, 0));

        r.JanelaDias.Should().Be(90);
        r.GeradoEm.Should().Be(Hoje);
        r.Subprefeituras.Keys.Should().BeEquivalentTo(["mooca", "penha", "se"]);
        r.Zonas.Keys.Should().BeEquivalentTo(["zona-leste", "zona-centro"]);
        r.Subprefeituras["penha"].Should().BeNull();
        r.Zonas["zona-centro"].Should().BeNull();
    }

    [Fact]
    public void DiaIncompleto_NaoContaComoCompleto_MasSomaChuva()
    {
        var r = Calcular(Linha(Mooca, 0, chuva: 10, count: 96), Linha(Mooca, 1, chuva: 30, count: 79));

        var mooca = r.Subprefeituras["mooca"]!;
        mooca.DiasCompletos.Should().Be(1);
        mooca.ChuvaTotalMm.Should().Be(40);
    }

    [Fact]
    public void Janela_IncluiHojeMenos89_ExcluiHojeMenos90EOFuturo()
    {
        var r = Calcular(
            Linha(Mooca, 89, chuva: 1),
            Linha(Mooca, 90, chuva: 100),
            Linha(Mooca, -1, chuva: 100));

        r.Subprefeituras["mooca"]!.ChuvaTotalMm.Should().Be(1);
        r.Subprefeituras["mooca"]!.DiasCompletos.Should().Be(1);
    }

    [Fact]
    public void DiasAlerta_DaZona_ContaDiasDistintos()
    {
        var r = Calcular(
            Linha(Mooca, 0, alto: 2), Linha(Penha, 0, alto: 5),
            Linha(Penha, 3, alto: 1), Linha(Mooca, 4));

        r.Subprefeituras["mooca"]!.DiasAlerta.Should().Be(1);
        r.Subprefeituras["penha"]!.DiasAlerta.Should().Be(2);
        r.Zonas["zona-leste"]!.DiasAlerta.Should().Be(2);
    }

    [Fact]
    public void FaixaPredominante_SomaLeituras_EmpateVaiParaAMaisGrave()
    {
        var r = Calcular(
            Linha(Mooca, 0, baixo: 50, moderado: 46, alto: 0),
            Linha(Mooca, 1, baixo: 0, moderado: 50, alto: 46),
            Linha(Penha, 0, baixo: 48, moderado: 48, alto: 0));

        r.Subprefeituras["mooca"]!.FaixaPredominante.Should().Be(FaixaRisco.MODERADO); // 50 x 96 x 46
        r.Subprefeituras["penha"]!.FaixaPredominante.Should().Be(FaixaRisco.MODERADO); // empate 48 x 48
    }

    [Fact]
    public void FaixaPredominante_SemNenhumaLeituraDeScore_EhBaixo()
    {
        var r = Calcular(Linha(Mooca, 0, baixo: 0, moderado: 0, alto: 0));

        r.Subprefeituras["mooca"]!.FaixaPredominante.Should().Be(FaixaRisco.BAIXO);
    }

    [Fact]
    public void Zona_ChuvaEhMedia_DiaMaisChuvosoEhOMaximo_DiasCompletosEhOMinimo()
    {
        var r = Calcular(
            Linha(Mooca, 0, chuva: 10), Linha(Mooca, 1, chuva: 38.24),
            Linha(Penha, 0, chuva: 20, count: 50));

        var zona = r.Zonas["zona-leste"]!;
        zona.ChuvaTotalMm.Should().Be(34.1);            // (48,24 + 20) / 2 = 34,12
        zona.DiaMaisChuvoso!.Dia.Should().Be(Hoje.AddDays(-1));
        zona.DiaMaisChuvoso.Mm.Should().Be(38.2);
        zona.DiasCompletos.Should().Be(0);               // Penha: 0 completos
        r.Subprefeituras["mooca"]!.DiasCompletos.Should().Be(2);
    }

    [Fact]
    public void DiaMaisChuvoso_EmpateFicaComOMaisRecente_SemChuvaEhNulo()
    {
        var r = Calcular(Linha(Mooca, 5, chuva: 12), Linha(Mooca, 2, chuva: 12), Linha(Penha, 0));

        r.Subprefeituras["mooca"]!.DiaMaisChuvoso!.Dia.Should().Be(Hoje.AddDays(-2));
        r.Subprefeituras["penha"]!.DiaMaisChuvoso.Should().BeNull();
    }

    [Fact]
    public void SemLinhas_TodasAsChavesNulas()
    {
        var r = Calcular();

        r.Subprefeituras.Values.Should().OnlyContain(v => v == null);
        r.Zonas.Values.Should().OnlyContain(v => v == null);
    }
}
