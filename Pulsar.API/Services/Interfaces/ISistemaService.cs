using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

/// <summary>
/// Visão administrativa de saúde do sistema: status da coleta, métricas agregadas
/// e disparo manual de coleta.
/// </summary>
public interface ISistemaService
{
    Task<SistemaStatusDto> ObterStatusAsync();
    Task<MetricasDto> ObterMetricasAsync();
    Task<ColetaResultadoDto> ForcarColetaAsync(CancellationToken ct = default);
}
