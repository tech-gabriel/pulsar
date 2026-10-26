namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Chuva e score de alagamento por subprefeitura e por hora. Existe para recalibrar o score
/// na escala do OpenWeatherMap: o score usa chuva de 1 h, 3 h e 48 h, e o agregado diário
/// só guarda o total do dia. Como as leituras vivem 72 h, sem esta tabela a série se perde.
/// </summary>
public class AgregadoHorario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;

    /// <summary>Início da hora, em UTC.</summary>
    public DateTime HoraUtc { get; set; }

    /// <summary>Chuva que o score usou, já com a PlausibilidadeChuva aplicada.</summary>
    public double ChuvaMm { get; set; }

    /// <summary>Mesma soma com o valor cru do OpenWeatherMap. Diferente de ChuvaMm quando a guarda barrou.</summary>
    public double ChuvaBrutaMm { get; set; }

    public double ScoreAlagamentoMax { get; set; }

    /// <summary>4 numa hora completa (ciclo de 15 min). Separa "não choveu" de "coletor fora do ar".</summary>
    public int LeiturasCount { get; set; }

    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
