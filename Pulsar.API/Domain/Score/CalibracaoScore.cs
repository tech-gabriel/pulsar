namespace Pulsar.API.Domain.Score;

/// <summary>
/// Parâmetros em produção. PONTO DE PARTIDA CALIBRÁVEL: gerado/ajustado pela ferramenta
/// Pulsar.Calibracao (backtest contra ocorrências do GeoSampa). Recalibrar = trocar este
/// arquivo pelo bloco que o relatório da ferramenta imprime.
/// </summary>
public static class CalibracaoScore
{
    public static readonly ParametrosScore Atual = new(
        Chuva1h: [new(0, 0), new(5, 30), new(15, 60), new(30, 100)],
        Chuva3h: [new(0, 0), new(15, 30), new(35, 60), new(60, 100)],
        Saturacao48h: [new(20, 0), new(80, 20)],
        // Níveis de aviso do INMET: < 40 sem aviso, 40-60 perigo potencial, > 60 perigo.
        Vento: [new(0, 0), new(40, 30), new(60, 60), new(100, 100)],
        // Índice de calor sobre a sensação térmica: 27-32 cautela, 32-41 cautela extrema, > 41 perigo.
        Calor: [new(27, 0), new(32, 30), new(41, 60), new(54, 100)],
        // Preenchido pela calibração. Vazio = todas neutras (1,0).
        Fatores: new Dictionary<string, double>());
}
