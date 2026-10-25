using FluentAssertions;
using Pulsar.API.External.Clients;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class PlausibilidadeChuvaTests
{
    private static readonly DateTime Agora = new(2026, 10, 18, 15, 10, 0, DateTimeKind.Utc);

    /// <summary>Uma leitura a cada 15 min nas últimas <paramref name="horas"/> horas.</summary>
    private static IEnumerable<(DateTime, double)> Leituras(double mmH, double horas)
        => Enumerable.Range(0, (int)(horas * 4)).Select(q => (Agora.AddMinutes(-15 * q), mmH));

    /// <summary>Open-Meteo com a mesma chuva em todas as horas da janela.</summary>
    private static Dictionary<DateTime, double> Referencia(double mmPorHora)
        => Enumerable.Range(-12, 16).ToDictionary(h => new DateTime(2026, 10, 18, 15, 0, 0, DateTimeKind.Utc).AddHours(h), _ => mmPorHora);

    [Fact]
    public void ChuvaFalsaDe18deOutubro_EImplausivel()
        // ~8 mm/h por 6 h no OpenWeatherMap contra garoa de 0,05 mm/h no Open-Meteo.
        => PlausibilidadeChuva.Implausivel(Leituras(8, 6), Agora, Referencia(0.05)).Should().BeTrue();

    [Fact]
    public void TempestadeRealComOpenMeteoMarcandoMenos_Passa()
        // Na tempestade de 25/10 o OpenWeatherMap ficou em ~2x o Open-Meteo.
        => PlausibilidadeChuva.Implausivel(Leituras(20, 6), Agora, Referencia(4)).Should().BeFalse();

    [Fact]
    public void PancadaCurtaComOpenMeteoSeco_PassaPorqueNaoChegaAoMinimo()
        // 30 mm/h por 30 min = 15 mm: abaixo do mínimo, o OpenWeatherMap vale.
        => PlausibilidadeChuva.Implausivel(Leituras(30, 0.5), Agora, Referencia(0)).Should().BeFalse();

    [Fact]
    public void LeiturasForaDaJanela_NaoContam()
    {
        var antigas = Enumerable.Range(0, 24).Select(q => (Agora.AddHours(-7).AddMinutes(-15 * q), 50.0));
        PlausibilidadeChuva.Implausivel(antigas, Agora, Referencia(0)).Should().BeFalse();
    }

    [Fact]
    public void Substituta_EAChuvaDoOpenMeteoNaHoraDaLeitura()
        => PlausibilidadeChuva.Substituta(Agora, Referencia(0.4)).Should().Be(0.4);

    [Fact]
    public void OpenMeteoParse_UmaOuVariasCoordenadas()
    {
        const string uma = """{"hourly":{"time":["2026-10-25T15:00","2026-10-25T16:00"],"precipitation":[1.2,null]}}""";
        var serie = OpenMeteoClient.Parse(uma).Single();
        serie[new DateTime(2026, 10, 25, 15, 0, 0, DateTimeKind.Utc)].Should().Be(1.2);
        serie[new DateTime(2026, 10, 25, 16, 0, 0, DateTimeKind.Utc)].Should().Be(0);
        serie.Keys.Should().OnlyContain(k => k.Kind == DateTimeKind.Utc);

        OpenMeteoClient.Parse($"[{uma},{uma}]").Should().HaveCount(2);
    }
}
