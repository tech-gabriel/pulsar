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
    public IList<AlertaSugestao> AlertaSugestoes { get; set; } = new List<AlertaSugestao>();
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
