namespace Pulsar.API.Domain.Score;

/// <summary>
/// Parâmetros em produção. Gerados pela ferramenta Pulsar.Calibracao (backtest contra
/// ocorrências do GeoSampa). Recalibrar = trocar este arquivo pelo bloco que o relatório
/// da ferramenta imprime.
///
/// Calibrado em 2026-10-01 contra GeoSampa jan-ago/2026 (457 ocorrências), clima do
/// Open-Meteo histórico: F1 antiga = 0 (nunca deu ALTO), F1 nova = 0,206 (precisão 15%,
/// cobertura 32%), ALTO em 5% dos dias por subprefeitura (trava contra excesso de alerta,
/// escolhida pelo produto). Os limiares de chuva saíram pela metade dos pontos de partida
/// porque modelos suavizam picos; a etapa 2 recalibra na escala do OpenWeatherMap
/// (fonte de produção) com dados próprios da estação chuvosa.
/// </summary>
public static class CalibracaoScore
{
    public static readonly ParametrosScore Atual = new(
        Chuva1h: [new(0, 0), new(2.5, 30), new(7.5, 60), new(15, 100)],
        Chuva3h: [new(0, 0), new(7.5, 30), new(17.5, 60), new(30, 100)],
        Saturacao48h: [new(20, 0), new(80, 10)],
        // Níveis de aviso do INMET: < 40 sem aviso, 40-60 perigo potencial, > 60 perigo.
        Vento: [new(0, 0), new(40, 30), new(60, 60), new(100, 100)],
        // Índice de calor sobre a sensação térmica: 27-32 cautela, 32-41 cautela extrema, > 41 perigo.
        Calor: [new(27, 0), new(32, 30), new(41, 60), new(54, 100)],
        // Rank dos dias com ocorrência (GeoSampa) normalizado para 0,85..1,15.
        Fatores: new Dictionary<string, double>
        {
            ["Aricanduva-Formosa-Carrão"] = 1.05,
            ["Butantã"] = 1.075,
            ["Campo Limpo"] = 1.15,
            ["Capela do Socorro"] = 1.1,
            ["Casa Verde-Limão-Cachoeirinha"] = 0.925,
            ["Cidade Ademar"] = 1.05,
            ["Cidade Tiradentes"] = 0.85,
            ["Ermelino Matarazzo"] = 0.9,
            ["Freguesia-Brasilândia"] = 0.875,
            ["Guaianases"] = 0.9,
            ["Ipiranga"] = 0.975,
            ["Itaim Paulista"] = 0.975,
            ["Itaquera"] = 1,
            ["Jabaquara"] = 1.025,
            ["Jaçanã-Tremembé"] = 0.95,
            ["Lapa"] = 0.85,
            ["M'Boi Mirim"] = 1.125,
            ["Mooca"] = 0.85,
            ["Parelheiros"] = 1,
            ["Penha"] = 1,
            ["Perus-Anhanguera"] = 0.9,
            ["Pinheiros"] = 0.9,
            ["Pirituba-Jaraguá"] = 0.925,
            ["Santana-Tucuruvi"] = 0.9,
            ["Santo Amaro"] = 0.95,
            ["Sapopemba"] = 0.925,
            ["São Mateus"] = 0.85,
            ["São Miguel"] = 1.15,
            ["Sé"] = 0.875,
            ["Vila Maria-Vila Guilherme"] = 0.925,
            ["Vila Mariana"] = 0.925,
            ["Vila Prudente"] = 1.05,
        });
}
