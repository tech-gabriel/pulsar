using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>
/// Estatísticas do rollup por página pública de SEO. Chaves = slug da página
/// ("mooca", "zona-leste"); valor nulo quando a área não tem linha na janela.
/// </summary>
public class EstatisticasRegioesDto
{
    public int JanelaDias { get; set; }
    public DateOnly GeradoEm { get; set; }
    public Dictionary<string, EstatisticaRegiaoDto?> Subprefeituras { get; set; } = new();
    public Dictionary<string, EstatisticaRegiaoDto?> Zonas { get; set; } = new();
}

public class EstatisticaRegiaoDto
{
    /// <summary>Dias com coleta completa. É o gate de exibição no site, não entra nas somas.</summary>
    public int DiasCompletos { get; set; }
    public int DiasAlerta { get; set; }
    public double ChuvaTotalMm { get; set; }
    public FaixaRisco FaixaPredominante { get; set; }
    public DiaChuvosoDto? DiaMaisChuvoso { get; set; }
}

public class DiaChuvosoDto
{
    public DateOnly Dia { get; set; }
    public double Mm { get; set; }
}
