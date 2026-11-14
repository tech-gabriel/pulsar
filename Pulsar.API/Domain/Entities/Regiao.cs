namespace Pulsar.API.Domain.Entities;

public class Regiao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;

    public Guid CidadeId { get; set; }
    public Cidade Cidade { get; set; } = null!;

    // Id IANA (ex.: "America/Sao_Paulo"). Fica na região porque o agregado diário
    // precisa de um dia calendário, e dia só existe dentro de um fuso. Guardar o id
    // e não o offset: o Brasil aboliu o horário de verão em 2019, mas isso é lei e
    // pode voltar. A Cidade já existe, mas o fuso continua aqui: subir a coluna mexeria
    // nos agregados sem ganho enquanto houver uma cidade só.
    public string FusoHorario { get; set; } = "America/Sao_Paulo";

    public IList<Subprefeitura> Subprefeituras { get; set; } = new List<Subprefeitura>();
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
