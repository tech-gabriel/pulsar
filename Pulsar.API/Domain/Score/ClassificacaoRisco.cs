using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Score;

/// <summary>Único lugar com os cortes de faixa. Valem para os três perigos e para a região.</summary>
public static class ClassificacaoRisco
{
    public const double LimiteBaixo = 30;
    public const double LimiteModerado = 60;

    public static FaixaRisco Faixa(double valor) => valor switch
    {
        <= LimiteBaixo => FaixaRisco.BAIXO,
        <= LimiteModerado => FaixaRisco.MODERADO,
        _ => FaixaRisco.ALTO
    };
}
