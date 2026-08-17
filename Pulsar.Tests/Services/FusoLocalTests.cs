using FluentAssertions;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class FusoLocalTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    private static readonly TimeZoneInfo Lisboa = TimeZoneInfo.FindSystemTimeZoneById("Europe/Lisbon");

    [Fact]
    public void DiaLocal_AntesDaMeiaNoiteLocal_AindaEhODiaAnterior()
    {
        // 02:00 UTC = 23:00 do dia anterior em SP (UTC-3).
        var instante = new DateTime(2026, 8, 18, 2, 0, 0, DateTimeKind.Utc);

        FusoLocal.DiaLocal(instante, Sp).Should().Be(new DateOnly(2026, 8, 17));
    }

    [Fact]
    public void DiaLocal_MesmoInstante_FusosDiferentes_DiasDiferentes()
    {
        // 02:00 UTC: em SP é dia 17 (23h), em Lisboa é dia 18 (03h, UTC+1 no verão).
        var instante = new DateTime(2026, 8, 18, 2, 0, 0, DateTimeKind.Utc);

        FusoLocal.DiaLocal(instante, Sp).Should().Be(new DateOnly(2026, 8, 17));
        FusoLocal.DiaLocal(instante, Lisboa).Should().Be(new DateOnly(2026, 8, 18));
    }

    [Fact]
    public void HoraLocal_ConverteAHoraDoRelogioLocal()
    {
        // 09:00 UTC = 06:00 em SP.
        var instante = new DateTime(2026, 8, 17, 9, 0, 0, DateTimeKind.Utc);

        FusoLocal.HoraLocal(instante, Sp).Should().Be(6);
    }

    [Fact]
    public void DiaLocal_InstanteSemKindDefinido_TrataComoUtc()
    {
        // Postgres devolve DateTime com Kind Unspecified em algumas configurações.
        // O contrato é que o instante já vem em UTC, então o Kind ausente não muda o dia.
        var semKind = new DateTime(2026, 8, 18, 2, 0, 0, DateTimeKind.Unspecified);

        FusoLocal.DiaLocal(semKind, Sp).Should().Be(new DateOnly(2026, 8, 17));
    }

    [Fact]
    public void DiaLocal_InstanteMarcadoComoLocal_NaoLanca()
    {
        // ConvertTimeFromUtc lança ArgumentException com Kind Local. É o único Kind que
        // quebra, e é o que um DateTime vindo de fora do EF pode trazer por engano.
        // O helper normaliza o Kind, então os mesmos dígitos são lidos como UTC.
        var marcadoLocal = new DateTime(2026, 8, 18, 2, 0, 0, DateTimeKind.Local);

        FusoLocal.DiaLocal(marcadoLocal, Sp).Should().Be(new DateOnly(2026, 8, 17));
    }
}
