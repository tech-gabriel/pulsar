namespace Pulsar.API.Domain.Score;

/// <summary>
/// Valor único de uma área a partir das células dela. Nem o pior trecho (um hexágono
/// isolado pintaria a área inteira), nem a maioria (um trecho grande em risco sumiria):
/// a média do quarto mais alto, que sobe conforme cresce a parte da área em risco.
/// Decisão de produto de 13/11/2026; a regra é ponto de partida e se ajusta com dados reais.
/// </summary>
public static class MeioTermo
{
    public static double Calcular(IReadOnlyList<double> valores)
    {
        if (valores.Count == 0) return 0;
        var quantos = (int)Math.Ceiling(valores.Count / 4.0);
        return valores.OrderByDescending(v => v).Take(quantos).Average();
    }
}
