namespace Pulsar.API.Domain.Entities;

/// <summary>
/// "Me avise quando melhorar": um pedido por pessoa para um caminho que hoje manda esperar.
/// Vive poucas horas e some no primeiro push. Sem FK para Usuario de propósito: se a conta
/// for apagada, o pedido expira sozinho e o push não acha aparelho.
/// </summary>
public class PedidoAvisoRota
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UsuarioId { get; set; }

    /// <summary>Guids das subprefeituras separados por vírgula, na ordem do caminho.</summary>
    public string SubprefeituraIds { get; set; } = string.Empty;

    /// <summary>Rótulo curto do destino, usado na copy do push.</summary>
    public string Destino { get; set; } = string.Empty;

    public DateTime CriadoEm { get; set; }
    public DateTime ExpiraEm { get; set; }
}
