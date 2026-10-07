using FluentAssertions;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.Tests.Domain;

public class ClassificacaoRiscoRotuloTests
{
    [Theory]
    [InlineData(FaixaRisco.BAIXO, "Tranquilo")]
    [InlineData(FaixaRisco.MODERADO, "Atenção")]
    [InlineData(FaixaRisco.ALTO, "Alerta")]
    public void Rotulo_DevolveONomeDaFaixa(FaixaRisco faixa, string esperado)
        => ClassificacaoRisco.Rotulo(faixa).Should().Be(esperado);

    [Fact]
    public void Rotulo_FaixaDesconhecida_Lanca()
        => FluentActions.Invoking(() => ClassificacaoRisco.Rotulo((FaixaRisco)99))
            .Should().Throw<ArgumentOutOfRangeException>();
}
