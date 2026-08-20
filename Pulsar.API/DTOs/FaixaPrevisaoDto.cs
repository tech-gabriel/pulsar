namespace Pulsar.API.DTOs;

/// <summary>
/// Faixa de 3h de uma região, agregada por PIOR CASO entre as subprefeituras.
/// Média esconderia o evento local, que é o diferencial do produto.
/// </summary>
public class FaixaPrevisaoDto
{
    public DateTime InstantePrevisto { get; set; }
    public double ChuvaMm { get; set; }
    public double ProbabilidadeChuva { get; set; }
    public double VentoKmH { get; set; }
    public double? RajadaKmH { get; set; }
    public double TemperaturaC { get; set; }
    public int CondicaoCodigo { get; set; }
    public string CondicaoDescricao { get; set; } = string.Empty;

    /// <summary>Coleta mais antiga entre as subs desta faixa. Alimenta o aviso de previsão velha.</summary>
    public DateTime ColetadoEm { get; set; }
}
