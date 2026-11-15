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

    /// <summary>
    /// O risco de cada trecho de uma área: a chuva de modelo da área com o fator do trecho e,
    /// onde há estação a até <see cref="RaioEstacaoKm"/>, a chuva medida no lugar dela (mesmo
    /// quando a estação marca zero e o modelo diz chuva).
    /// </summary>
    public static IReadOnlyList<TrechoRisco> DaArea(
        EntradaScore modelo, IReadOnlyList<CelulaGrade> celulas, IReadOnlyList<EstacaoChuva> estacoes)
    {
        var trechos = new List<TrechoRisco>(celulas.Count);
        foreach (var celula in celulas)
        {
            var estacao = EstacaoChuva.MaisProxima(celula.Lat, celula.Lon, estacoes, RaioEstacaoKm);
            var risco = estacao is null
                ? CalculadoraScore.Calcular(modelo, CalibracaoScore.Atual, celula.Fator).Alagamento
                : ComChuvaMedida(modelo, estacao, celula.Fator);
            trechos.Add(new TrechoRisco(celula, risco, estacao));
        }
        return trechos;
    }

    /// <summary>
    /// O alagamento da área inteira (o meio-termo dos trechos) e a chuva que explica o número.
    /// O número vem do quarto mais alto dos trechos: se metade ou mais deles tem estação, foi a
    /// chuva medida que o fez, e ela é a média das estações deles. Senão, null: vale a do modelo.
    /// </summary>
    public static AlagamentoArea MeioTermoDaArea(IReadOnlyList<TrechoRisco> trechos)
    {
        var alagamento = ComponenteScore.De(MeioTermo.Calcular(trechos.Select(t => t.Risco.Valor).ToList()));
        var topo = trechos.OrderByDescending(t => t.Risco.Valor).Take(MeioTermo.Quantos(trechos.Count)).ToList();
        var medidas = topo.Where(t => t.Estacao is not null).Select(t => t.Estacao!.Mm3h).ToList();
        double? chuvaMedida = topo.Count > 0 && medidas.Count * 2 >= topo.Count ? medidas.Average() : null;
        return new AlagamentoArea(alagamento, chuvaMedida);
    }
}

/// <summary>Alagamento da área pelos trechos e a chuva medida de 3 h que o explica (null = modelo).</summary>
public sealed record AlagamentoArea(ComponenteScore Alagamento, double? Chuva3hMedidaMm);

/// <summary>Um trecho com o risco de alagamento dele e a estação que mandou na conta (null = modelo).</summary>
public readonly record struct TrechoRisco(CelulaGrade Celula, ComponenteScore Risco, EstacaoChuva? Estacao);
