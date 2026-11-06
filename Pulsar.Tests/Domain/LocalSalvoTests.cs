using FluentAssertions;
using Pulsar.API.Domain.Entities;

namespace Pulsar.Tests.Domain;

public class LocalSalvoTests
{
    [Theory]
    [InlineData(-23.5614, -46.6559)]
    [InlineData(-23.6466, -46.6413)]
    public void DentroDeSaoPaulo_PaulistaEJabaquara_True(double lat, double lon) =>
        LocalSalvo.DentroDeSaoPaulo(lat, lon).Should().BeTrue();

    [Theory]
    [InlineData(-22.9056, -47.0608)]
    [InlineData(-23.3, -46.53)]
    public void DentroDeSaoPaulo_CampinasEGuarulhosCentro_False(double lat, double lon) =>
        LocalSalvo.DentroDeSaoPaulo(lat, lon).Should().BeFalse();

    [Fact]
    public void DentroDeSaoPaulo_NaN_False() =>
        LocalSalvo.DentroDeSaoPaulo(double.NaN, -46.6).Should().BeFalse();
}
