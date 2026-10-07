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

    /// <summary>
    /// Nome da faixa para gente ler (app e push). Vocabulário próprio, inspirado mas não
    /// igual ao da Defesa Civil: o Pulsar é estimativa, não alerta oficial. Um arm por valor
    /// e sem catch-all, pelo mesmo motivo do antigo TextoDaFaixa: traduzir o desconhecido
    /// como "Tranquilo" erraria sempre para o lado perigoso.
    /// </summary>
    public static string Rotulo(FaixaRisco faixa) => faixa switch
    {
        FaixaRisco.BAIXO => "Tranquilo",
        FaixaRisco.MODERADO => "Atenção",
        FaixaRisco.ALTO => "Alerta",
        _ => throw new ArgumentOutOfRangeException(nameof(faixa), faixa, "Faixa sem rótulo."),
    };
}
