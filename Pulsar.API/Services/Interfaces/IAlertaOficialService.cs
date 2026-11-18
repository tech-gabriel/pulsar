using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Services.Interfaces;

/// <summary>Resultado de uma leitura do feed. HaAlertaSp: algum alerta da Defesa Civil de SP valendo agora no feed.</summary>
/// <param name="NovosExtremos">Alertas Extremos que entraram nesta leitura: o job chama o motor de push na hora.</param>
public record ResultadoSincronizacao(bool Ok, int Novos, int Cancelados, bool HaAlertaSp, int NovosExtremos = 0);

public interface IAlertaOficialService
{
    /// <summary>Lê o feed da IDAP e grava os alertas que atingem áreas do Pulsar. Nunca lança por falha do feed.</summary>
    Task<ResultadoSincronizacao> SincronizarAsync(DateTime agoraUtc, CancellationToken ct = default);

    /// <summary>Alertas ativos agora, por área atingida. Área sem alerta não aparece.</summary>
    Task<IReadOnlyDictionary<Guid, IReadOnlyList<AlertaOficial>>> AtivosPorAreaAsync(DateTime agoraUtc, CancellationToken ct = default);
}
