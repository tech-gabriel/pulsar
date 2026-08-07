using Pulsar.API.Domain.Entities;

namespace Pulsar.API.External.Interfaces;

/// <summary>Busca ocorrências de alagamento/inundação no WFS do GeoSampa.</summary>
public interface IGeoSampaClient
{
    Task<IReadOnlyList<OcorrenciaAlagamento>> ObterOcorrenciasAsync(CancellationToken ct = default);
}
