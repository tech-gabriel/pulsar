using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Casa ou trabalho da pessoa (um de cada). Guarda a coordenada exata e a subprefeitura
/// resolvida, que é por onde o risco e o push chegam.
/// </summary>
public class LocalSalvo
{
    public const int MaxRotulo = 200;

    // Retângulo grosso do município. A checagem fina por polígono é do navegador
    // (decisão da spec); aqui só barramos o que claramente está fora de São Paulo.
    private const double LatMin = -24.01, LatMax = -23.35;
    private const double LonMin = -46.83, LonMax = -46.36;

    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public TipoLocal Tipo { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Rotulo { get; set; } = string.Empty;
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }

    /// <summary>NaN falha em toda comparação, então já cai em false.</summary>
    public static bool DentroDeSaoPaulo(double lat, double lon) =>
        lat >= LatMin && lat <= LatMax && lon >= LonMin && lon <= LonMax;
}
