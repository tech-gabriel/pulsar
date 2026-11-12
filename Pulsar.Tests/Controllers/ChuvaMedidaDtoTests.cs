using FluentAssertions;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Controllers;

/// <summary>Quem fala pela região: o CGE-SP na frente, o CEMADEN só quando o CGE não tem dado.</summary>
public class ChuvaMedidaDtoTests
{
    private static readonly Guid Sub = Guid.NewGuid();
    private static readonly DateTime Agora = new(2026, 11, 11, 20, 0, 0, DateTimeKind.Utc);

    private static readonly ChuvaMedidaRegiao Cge = new(Sub, 1000848, "Lapa", Vizinho: false, 4.0, 6.0, null, 9.0, Agora);

    private static ChuvaCemadenRegiao Cemaden(double? mm1h = 2.5, double? mm24h = 12.0)
        => new(Sub,
            mm1h, mm1h is null ? null : "Butantã", mm1h is null ? null : Agora.AddMinutes(-3),
            mm24h, mm24h is null ? null : "Jaraguá", mm24h is null ? null : Agora.AddMinutes(-3));

    [Fact]
    public void De_ComCge_OCgeFalaMesmoComCemadenPresente()
    {
        var dto = ChuvaMedidaDto.De(Cge, Cemaden());

        dto.Should().BeEquivalentTo(new
        {
            Fonte = "cge", Mm15 = 4.0, Mm60 = (double?)null, AcumuladoPeriodoMm = 9.0, Posto = "Lapa", Vizinho = false, ColetadoEm = Agora,
        });
    }

    [Fact]
    public void De_SemCgeComCemaden_MostraAUltimaHoraENunca15Minutos()
    {
        var dto = ChuvaMedidaDto.De(null, Cemaden());

        dto.Should().BeEquivalentTo(new
        {
            Fonte = "cemaden", Mm15 = (double?)null, Mm60 = 2.5, AcumuladoPeriodoMm = (double?)null,
            Posto = "Butantã", Vizinho = false, ColetadoEm = Agora.AddMinutes(-3),
        });
        dto!.ColetadoEm.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void De_SemCgeECemadenSemAUltimaHora_ENull()
        => ChuvaMedidaDto.De(null, Cemaden(mm1h: null)).Should().BeNull();

    [Fact]
    public void De_SemNenhumaFonte_ENull()
        => ChuvaMedidaDto.De(null, null).Should().BeNull();

    [Fact]
    public void Chuva24h_VemDoCemaden()
    {
        var dto = Chuva24hDto.De(Cemaden());

        dto.Should().BeEquivalentTo(new { Mm = 12.0, Estacao = "Jaraguá", MedidoEm = Agora.AddMinutes(-3) });
        dto!.MedidoEm.Kind.Should().Be(DateTimeKind.Utc);
    }

    [Fact]
    public void Chuva24h_ZeroEZeroENaoNull()
        => Chuva24hDto.De(Cemaden(mm24h: 0.0))!.Mm.Should().Be(0.0);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Chuva24h_SemDadoDe24h_ENull(bool semCemaden)
        => Chuva24hDto.De(semCemaden ? null : Cemaden(mm24h: null)).Should().BeNull();
}
