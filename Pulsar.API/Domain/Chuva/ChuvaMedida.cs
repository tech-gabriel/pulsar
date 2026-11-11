namespace Pulsar.API.Domain.Chuva;

/// <summary>
/// Uma leitura de um posto, como a conta enxerga. Assinatura = os outros instrumentos
/// concatenados; serve só para detectar posto parado.
/// </summary>
public record LeituraPosto(DateTime ColetadoEm, double AcumuladoMm, string Assinatura);

/// <summary>
/// Transforma o acumulado do posto (que só zera uma vez por dia) em chuva de uma janela.
/// Pura: sem banco, sem rede, sem relógio. Null quer dizer "não dá para afirmar", que é
/// diferente de zero: zero é chuva nenhuma MEDIDA.
/// </summary>
public static class ChuvaMedida
{
    /// <summary>Última leitura mais velha que isto não diz nada sobre agora (um ciclo de 15 min e folga).</summary>
    public const int IdadeMaximaMinutos = 20;

    /// <summary>Folga, para cada lado, para achar a leitura do começo da janela.</summary>
    public const int ToleranciaBaseMinutos = 10;

    /// <summary>
    /// Leituras seguidas idênticas em TODOS os instrumentos que caracterizam posto parado (2 h).
    /// Chuva igual sozinha não basta: sem chuva o acumulado fica igual o dia inteiro.
    /// </summary>
    public const int LeiturasParado = 8;

    /// <summary>Chuva em mm nos últimos <paramref name="minutos"/>, com as leituras em ordem crescente.</summary>
    public static double? MmNaJanela(IReadOnlyList<LeituraPosto> emOrdem, DateTime agoraUtc, int minutos)
    {
        if (emOrdem.Count == 0 || Parado(emOrdem)) return null;
        if (emOrdem[^1].ColetadoEm < agoraUtc.AddMinutes(-IdadeMaximaMinutos)) return null;

        var inicio = agoraUtc.AddMinutes(-minutos);
        var tolerancia = TimeSpan.FromMinutes(ToleranciaBaseMinutos);
        var iBase = -1;
        for (var i = emOrdem.Count - 1; i >= 0; i--)
        {
            var t = emOrdem[i].ColetadoEm;
            if (t >= inicio - tolerancia && t <= inicio + tolerancia) { iBase = i; break; }
        }
        // Sem leitura no começo da janela não há de onde subtrair. A última leitura sozinha
        // também não serve de base de si mesma.
        if (iBase < 0 || iBase == emOrdem.Count - 1) return null;

        var soma = 0.0;
        for (var i = iBase + 1; i < emOrdem.Count; i++)
        {
            var delta = emOrdem[i].AcumuladoMm - emOrdem[i - 1].AcumuladoMm;
            // Acumulado caiu = zeramento: vale o que choveu desde o zero, nunca um negativo.
            soma += delta >= 0 ? delta : emOrdem[i].AcumuladoMm;
        }
        return Math.Round(soma, 1);
    }

    public static bool Parado(IReadOnlyList<LeituraPosto> emOrdem)
    {
        if (emOrdem.Count < LeiturasParado) return false;
        var ultima = emOrdem[^1];
        return emOrdem.Skip(emOrdem.Count - LeiturasParado)
            .All(l => l.AcumuladoMm == ultima.AcumuladoMm && l.Assinatura == ultima.Assinatura);
    }
}
