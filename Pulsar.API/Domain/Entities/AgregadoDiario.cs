namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Agregado diário por subprefeitura. É a única memória de longo prazo do sistema:
/// leituras, scores e alertas são apagados em cascata pela retenção curta, então o
/// que não estiver aqui não existe mais depois de alguns dias.
/// </summary>
public class AgregadoDiario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;

    /// <summary>Dia calendário LOCAL, no fuso de <see cref="FusoHorario"/>. Não é UTC.</summary>
    public DateOnly Dia { get; set; }

    /// <summary>
    /// Fuso usado para somar esta linha. Redundante com Regiao.FusoHorario de propósito:
    /// se o fuso de uma região for corrigido depois, dá para saber quais linhas vieram
    /// da definição antiga em vez de misturar duas séries em silêncio.
    /// </summary>
    public string FusoHorario { get; set; } = string.Empty;

    public double ChuvaTotalMm { get; set; }
    public double ScoreMin { get; set; }
    public double ScoreMedio { get; set; }
    public double ScoreMax { get; set; }

    // Contagem de leituras por faixa. Fazem trabalho duplo: LeiturasAlto > 0 responde
    // "teve risco alto neste dia", e a soma ao longo de N dias dá a faixa predominante
    // por leitura, mais fiel que a moda das modas diárias.
    public int LeiturasBaixo { get; set; }
    public int LeiturasModerado { get; set; }
    public int LeiturasAlto { get; set; }

    public double VentoMaxKmH { get; set; }
    public double TemperaturaMinC { get; set; }
    public double TemperaturaMaxC { get; set; }
    public double UvMax { get; set; }

    /// <summary>
    /// Quantas leituras sustentam a linha. É o que distingue "não choveu" de "o coletor
    /// ficou fora do ar": dia completo tem ~96 leituras (ciclo de 15 min).
    /// </summary>
    public int LeiturasCount { get; set; }

    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
