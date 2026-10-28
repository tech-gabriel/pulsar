namespace Pulsar.API.Services;

/// <summary>
/// Barra a chuva do OpenWeatherMap quando ela passa horas muito acima do Open-Meteo.
/// </summary>
/// <remarks>
/// Por que existe: em set e out/2026 o OpenWeatherMap mandou dias seguidos de chuva forte
/// para Sé, Lapa, Pinheiros, Butantã, Vila Mariana e Pirituba-Jaraguá (até 367 mm num dia em
/// que o Open-Meteo marcou 2,6 mm), e isso disparou push de score alto falso.
///
/// Por que soma de 6 h e não a leitura da hora: em tempestade real o Open-Meteo erra o
/// horário, e numa hora isolada o OpenWeatherMap chega a 10x ele. Na soma de 6 h, com folga de
/// 3 h para cada lado no Open-Meteo, a chuva real fica perto e a falsa fica muito acima.
/// Backtest (25/10/2026): barra 0 mm dos 5.756 mm da tempestade de 24-25/10 e ~80% da chuva
/// falsa. Abaixo de 6x a tempestade real começa a ser barrada; 8x deixa margem.
/// </remarks>
public static class PlausibilidadeChuva
{
    public const int JanelaHoras = 6;
    private const int FolgaHoras = 3;
    private const double MinimoMm = 20;
    private const double Fator = 8;

    /// <param name="leiturasCruas">Leituras do OpenWeatherMap das últimas horas (valor cru), incluindo a atual.</param>
    /// <param name="referencia">Chuva horária do Open-Meteo no ponto, chaveada pela hora UTC.</param>
    public static bool Implausivel(
        IEnumerable<(DateTime Ts, double MmH)> leiturasCruas, DateTime agora, IReadOnlyDictionary<DateTime, double> referencia)
    {
        // Leitura de 15 min: mm/h * 0,25h, a mesma conta do agregado diário.
        var owm = leiturasCruas.Where(l => l.Ts > agora.AddHours(-JanelaHoras) && l.Ts <= agora).Sum(l => l.MmH * 0.25);
        if (owm < MinimoMm) return false;

        var hora = Hora(agora);
        var om = referencia
            .Where(r => r.Key >= hora.AddHours(-(JanelaHoras + FolgaHoras)) && r.Key <= hora.AddHours(FolgaHoras))
            .Sum(r => r.Value);
        return owm > Fator * om;
    }

    /// <summary>O que gravar no lugar: a chuva do Open-Meteo na hora da leitura.</summary>
    public static double Substituta(DateTime agora, IReadOnlyDictionary<DateTime, double> referencia)
        => referencia.TryGetValue(Hora(agora), out var mm) ? mm : 0.0;

    private static DateTime Hora(DateTime t) => new(t.Year, t.Month, t.Day, t.Hour, 0, 0, DateTimeKind.Utc);
}
