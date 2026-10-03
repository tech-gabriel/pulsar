namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Cópia dos favoritos de zona apagados no SP1. Serve ao aviso único (quem avisar e de qual
/// zona) e de plano de volta. Temporária: sai num PR de limpeza quando todos forem avisados.
/// </summary>
public class MigracaoFavoritoZona
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public Guid RegiaoId { get; set; }
    public Regiao Regiao { get; set; } = null!;
    public DateTime? PushAvisadoEm { get; set; }
    public DateTime? EmailAvisadoEm { get; set; }
}
