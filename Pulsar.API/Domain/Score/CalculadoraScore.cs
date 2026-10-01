using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Score;

public readonly record struct EntradaScore(
    double Chuva1hMm, double Chuva3hMm, double Chuva48hMm,
    double VentoKmH, double SensacaoC, string Subprefeitura);

public readonly record struct ComponenteScore(double Valor, FaixaRisco Faixa)
{
    public static ComponenteScore De(double valor)
    {
        var v = Math.Clamp(double.IsNaN(valor) ? 0 : valor, 0, 100);
        return new(v, ClassificacaoRisco.Faixa(v));
    }
}

public readonly record struct ResultadoScore(
    ComponenteScore Alagamento, ComponenteScore Vento, ComponenteScore Calor, TipoPerigo Principal)
{
    public ComponenteScore DoPrincipal => Principal switch
    {
        TipoPerigo.VENTO => Vento,
        TipoPerigo.CALOR => Calor,
        _ => Alagamento,
    };
}

/// <summary>
/// Score por perigo. Puro: sem banco, sem rede, sem relógio. A ferramenta
/// Pulsar.Calibracao chama exatamente este código no backtest.
/// </summary>
public static class CalculadoraScore
{
    public static ResultadoScore Calcular(EntradaScore e) => Calcular(e, CalibracaoScore.Atual);

    public static ResultadoScore Calcular(EntradaScore e, ParametrosScore p)
    {
        var intensidade = Math.Max(
            Curva.Interpolar(p.Chuva1h, e.Chuva1hMm),
            Curva.Interpolar(p.Chuva3h, e.Chuva3hMm));
        // Solo encharcado só agrava chuva que está caindo: sem chuva agora, não há o que escoar.
        var saturacao = intensidade > 0 ? Curva.Interpolar(p.Saturacao48h, e.Chuva48hMm) : 0;
        var alagamento = ComponenteScore.De((intensidade + saturacao) * p.Fator(e.Subprefeitura));
        var vento = ComponenteScore.De(Curva.Interpolar(p.Vento, e.VentoKmH));
        var calor = ComponenteScore.De(Curva.Interpolar(p.Calor, e.SensacaoC));

        // Maior estrito ganha; empate fica com quem vem antes (alagamento, depois vento).
        var principal = TipoPerigo.ALAGAMENTO;
        var maior = alagamento.Valor;
        if (vento.Valor > maior) { principal = TipoPerigo.VENTO; maior = vento.Valor; }
        if (calor.Valor > maior) principal = TipoPerigo.CALOR;

        return new ResultadoScore(alagamento, vento, calor, principal);
    }
}
