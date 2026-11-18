using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Casa ou trabalho da pessoa (um de cada). Guarda a coordenada exata e a subprefeitura
/// resolvida, que é por onde o risco e o push chegam.
/// </summary>
public class LocalSalvo
{
    public const int MaxRotulo = 200;

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
}
