namespace Pulsar.API.Domain.Entities;

public class Regiao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;

    // Id IANA (ex.: "America/Sao_Paulo"). Fica na região porque o agregado diário
    // precisa de um dia calendário, e dia só existe dentro de um fuso. Guardar o id
    // e não o offset: o Brasil aboliu o horário de verão em 2019, mas isso é lei e
    // pode voltar. Quando existir a entidade Cidade, esta coluna sobe um nível.
    public string FusoHorario { get; set; } = "America/Sao_Paulo";

    public IList<Subprefeitura> Subprefeituras { get; set; } = new List<Subprefeitura>();
    public IList<Alerta> Alertas { get; set; } = new List<Alerta>();
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
