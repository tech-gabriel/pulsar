namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Município monitorado. As regiões (e, por elas, as áreas e a grade) pertencem a uma
/// cidade. Hoje só existe São Paulo; a segunda cidade entra aqui, sem outra reforma.
/// </summary>
public class Cidade
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public string Uf { get; set; } = string.Empty;

    // Código IBGE do município (7 dígitos). É a chave que as fontes nacionais usam (CEMADEN).
    public string CodigoIbge { get; set; } = string.Empty;

    public IList<Regiao> Regioes { get; set; } = new List<Regiao>();
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
