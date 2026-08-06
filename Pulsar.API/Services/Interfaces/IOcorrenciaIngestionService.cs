using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IOcorrenciaIngestionService
{
    /// <summary>Busca as ocorrências no GeoSampa e faz upsert no banco.</summary>
    Task<OcorrenciaSincronizacaoDto> SincronizarAsync(CancellationToken ct = default);
}
