namespace Pulsar.API.Domain.Entities;

public class Subprefeitura
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RegiaoId { get; set; }
    public Regiao Regiao { get; set; } = null!;
    public string Nome { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool Ativa { get; set; } = true;
    public IList<LeituraClimatica> Leituras { get; set; } = new List<LeituraClimatica>();
    public IList<ScorePerigo> Scores { get; set; } = new List<ScorePerigo>();
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }

    public LeituraClimatica? GetUltimaLeitura()
        => Leituras.OrderByDescending(l => l.Timestamp).FirstOrDefault();

    public ScorePerigo? GetUltimoScore()
        => Scores.OrderByDescending(s => s.Timestamp).FirstOrDefault();

    public IList<LeituraClimatica> GetHistorico(int horas = 24)
    {
        var limite = DateTime.UtcNow.AddHours(-horas);
        return Leituras
            .Where(l => l.Timestamp >= limite)
            .OrderBy(l => l.Timestamp)
            .ToList();
    }
}
