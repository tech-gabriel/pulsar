using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Entities;

public class Sugestao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Categoria { get; set; } = string.Empty;
    public FaixaRisco FaixaRisco { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public bool Ativa { get; set; } = true;

    /// <summary>Ordem de exibição dentro de categoria e faixa (1 = primeira).</summary>
    public int Ordem { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
