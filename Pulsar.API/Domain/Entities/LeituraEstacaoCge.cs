namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Leitura bruta de um posto meteorológico do CGE-SP, uma por posto por ciclo de coleta. É dado
/// MEDIDO (pluviômetro), ao contrário da <see cref="LeituraClimatica"/>, que é modelo. A chuva
/// vem acumulada desde o zeramento diário; a de uma janela sai da diferença entre leituras
/// (ver Domain/Chuva/ChuvaMedida). Sem retenção por enquanto: cerca de um milhão de linhas por ano.
/// </summary>
public class LeituraEstacaoCge
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Código do posto no CGE (parâmetro POSTO da página).</summary>
    public int Posto { get; set; }

    /// <summary>Null nos postos de fora da capital, que são guardados mas não alimentam alerta nem tela.</summary>
    public Guid? SubprefeituraId { get; set; }

    /// <summary>Horário da NOSSA coleta, em UTC. A página do CGE não informa o horário da leitura.</summary>
    public DateTime ColetadoEm { get; set; }

    public double ChuvaPeriodoMm { get; set; }
    public double ChuvaPeriodoAnteriorMm { get; set; }
    public TimeOnly? Zeramento { get; set; }
    public double? TemperaturaC { get; set; }
    public double? UmidadePct { get; set; }
    public string? VentoDirecao { get; set; }
    public double? VentoKmH { get; set; }
    public double? RajadaKmH { get; set; }
    public double? PressaoHpa { get; set; }
}
