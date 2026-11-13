using FluentAssertions;
using Pulsar.API.Domain.Score;
using Pulsar.Calibracao;

namespace Pulsar.Tests.Domain;

public class GradeCelulasTests
{
    private static readonly GradeCelulas Grade = new();

    // Trava do elo mais frágil: o nome da área no arquivo gerado precisa ser o nome do
    // banco. Área sem célula ficaria sem risco por trecho em silêncio.
    [Fact]
    public void Grade_Real_CobreAs32Subprefeituras()
    {
        foreach (var s in Subprefeituras.Todas)
            Grade.DaArea(s.Nome).Should().NotBeEmpty($"{s.Nome} precisa de células");
    }

    [Fact]
    public void Grade_Real_CelulasUnicasEFatorDentroDaFaixa()
    {
        var todas = Subprefeituras.Todas.SelectMany(s => Grade.DaArea(s.Nome)).ToList();

        todas.Select(c => c.H3).Should().OnlyHaveUniqueItems();
        todas.Should().OnlyContain(c => c.Fator >= 0.85 && c.Fator <= 1.4375);
        todas.Should().OnlyContain(c => c.Lat < -23.3 && c.Lat > -24.1 && c.Lon < -46.3 && c.Lon > -46.9);
    }

    [Fact]
    public void DaArea_AreaDesconhecida_DevolveVazio()
        => Grade.DaArea("Área que não existe").Should().BeEmpty();
}
