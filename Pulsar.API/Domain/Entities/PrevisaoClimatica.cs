namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Uma faixa de 3h de previsão para uma subprefeitura. O plano grátis do
/// OpenWeatherMap só oferece passos de 3h (5 dias), então esta é a menor
/// granularidade possível: não existe previsão horária aqui.
/// </summary>
public class PrevisaoClimatica
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;

    /// <summary>Início da faixa de 3h, em UTC. Chave do upsert junto da subprefeitura.</summary>
    public DateTime InstantePrevisto { get; set; }

    /// <summary>Chuva acumulada prevista na faixa de 3h, em mm. Zero quando a API omite `rain`.</summary>
    public double ChuvaMm { get; set; }

    /// <summary>Probabilidade de precipitação, de 0 a 1 (campo `pop` da API).</summary>
    public double ProbabilidadeChuva { get; set; }

    public double VentoKmH { get; set; }

    /// <summary>Rajada em km/h. Nulo quando a API omite `wind.gust`, o que acontece.</summary>
    public double? RajadaKmH { get; set; }

    public double TemperaturaC { get; set; }

    public int CondicaoCodigo { get; set; }
    public string CondicaoDescricao { get; set; } = string.Empty;

    /// <summary>
    /// Quando esta previsão foi buscada. É o que sustenta a guarda de idade da coleta
    /// e o aviso de "previsão velha" no front. Não confundir com InstantePrevisto,
    /// que é o futuro.
    /// </summary>
    public DateTime ColetadoEm { get; set; }
}
