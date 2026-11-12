namespace Pulsar.API.Services.Interfaces;

/// <summary>
/// A chuva do CEMADEN que vale para uma subprefeitura agora. A última hora e as 24 horas vêm
/// cada uma da estação válida mais próxima QUE TEM aquele dado, então podem ser de estações
/// diferentes. Null = nenhuma estação por perto tem aquela janela (não é zero).
/// </summary>
/// <param name="DataHora1h">Instante da consulta no CEMADEN, em UTC (não é o horário em que a estação mediu).</param>
public record ChuvaCemadenRegiao(
    Guid SubprefeituraId,
    double? Mm1h, string? Estacao1h, DateTime? DataHora1h,
    double? Mm24h, string? Estacao24h, DateTime? DataHora24h);

public interface ICemadenService
{
    /// <summary>
    /// Lê os acumulados de cada município configurado e grava uma leitura por estação. Não
    /// lança: sem credencial ou com o CEMADEN fora do ar, registra um aviso e não grava nada.
    /// </summary>
    Task ColetarAsync(CancellationToken ct = default);

    /// <summary>
    /// Uma entrada por subprefeitura ativa com estação válida por perto. Subprefeitura ausente =
    /// sem dado do CEMADEN agora.
    /// </summary>
    Task<IReadOnlyDictionary<Guid, ChuvaCemadenRegiao>> ObterPorSubprefeituraAsync(DateTime agoraUtc, CancellationToken ct = default);
}
