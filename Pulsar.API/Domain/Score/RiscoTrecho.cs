using Pulsar.API.Domain.Chuva;

namespace Pulsar.API.Domain.Score;

/// <summary>
/// O risco de alagamento de um trecho com a chuva MEDIDA perto dele. Único lugar com a regra
/// "a medida manda": a conferência do ciclo e o aviso de casa e trabalho fazem a mesma conta.
/// </summary>
public static class RiscoTrecho
{
    /// <summary>
    /// Até onde uma estação ainda fala pelo trecho (do centro da célula). Metade do raio que a
    /// tela usa para a área inteira: o trecho tem 900 m e a chuva de verão muda em poucos km.
    /// </summary>
    public const double RaioEstacaoKm = 5.0;

    /// <summary>
    /// Chuva de 1 h e 3 h da estação no lugar da do modelo; as 48 h da estação quando ela manda,
    /// senão as do modelo. O fator é o do trecho: o da área com o histórico de alagamento dele.
    /// </summary>
    public static ComponenteScore ComChuvaMedida(EntradaScore modelo, EstacaoChuva estacao, double fator)
        => CalculadoraScore.Calcular(
            modelo with { Chuva1hMm = estacao.Mm1h, Chuva3hMm = estacao.Mm3h, Chuva48hMm = estacao.Mm48h ?? modelo.Chuva48hMm },
            CalibracaoScore.Atual, fator).Alagamento;
}
