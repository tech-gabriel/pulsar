using Pulsar.API.Domain.Enums;

namespace Pulsar.API.Domain.Entities;

public class Regiao
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nome { get; set; } = string.Empty;
    public IList<Subprefeitura> Subprefeituras { get; set; } = new List<Subprefeitura>();
    public IList<Alerta> Alertas { get; set; } = new List<Alerta>();
    public IList<UsuarioRegiao> Favoritos { get; set; } = new List<UsuarioRegiao>();
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }

    public double GetScoreAgregado()
    {
        var scores = Subprefeituras
            .Where(s => s.Ativa)
            .Select(s => s.GetUltimoScore())
            .Where(s => s != null)
            .Select(s => s!.Valor)
            .ToList();

        return scores.Count == 0 ? 0 : scores.Max();
    }

    public FaixaRisco GetFaixaAgregada()
    {
        var score = GetScoreAgregado();
        return score switch
        {
            <= 30 => FaixaRisco.BAIXO,
            <= 60 => FaixaRisco.MODERADO,
            _ => FaixaRisco.ALTO
        };
    }
}
