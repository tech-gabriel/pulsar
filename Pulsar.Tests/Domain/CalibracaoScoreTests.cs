using FluentAssertions;
using Pulsar.API.Domain.Score;

namespace Pulsar.Tests.Domain;

/// <summary>Cada cidade com os próprios limiares; a capital nunca muda por causa da Baixada.</summary>
public class CalibracaoScoreTests
{
    [Fact]
    public void Para_AreaDaBaixada_UsaOsParametrosDaBaixada()
        => CalibracaoScore.Para("Santos").Should().BeSameAs(CalibracaoScore.Baixada);

    // Nome desconhecido cai na capital e nunca lança: o ciclo de coleta inteiro pararia.
    [Theory]
    [InlineData("Mooca")]
    [InlineData("Área que não existe")]
    [InlineData("")]
    public void Para_ForaDaBaixada_UsaOsDaCapital(string nome)
        => CalibracaoScore.Para(nome).Should().BeSameAs(CalibracaoScore.Atual);

    [Fact]
    public void Baixada_TemOsNoveMunicipiosNosFatores()
        => CalibracaoScore.Baixada.Fatores.Keys.Should().BeEquivalentTo(
            ["Santos", "São Vicente", "Guarujá", "Cubatão", "Praia Grande", "Bertioga", "Mongaguá", "Itanhaém", "Peruíbe"]);

    [Fact]
    public void Capital_ScoreIgualAoDeAntes()
    {
        var e = new EntradaScore(12, 25, 60, 30, 30, "Mooca");

        CalculadoraScore.Calcular(e).Should().BeEquivalentTo(CalculadoraScore.Calcular(e, CalibracaoScore.Atual));
    }
}
