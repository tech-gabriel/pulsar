using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class OcorrenciaIngestionService : IOcorrenciaIngestionService
{
    private readonly IGeoSampaClient _client;
    private readonly IOcorrenciaAlagamentoRepository _repo;
    private readonly ILogger<OcorrenciaIngestionService> _logger;

    public OcorrenciaIngestionService(
        IGeoSampaClient client,
        IOcorrenciaAlagamentoRepository repo,
        ILogger<OcorrenciaIngestionService> logger)
    {
        _client = client;
        _repo = repo;
        _logger = logger;
    }

    public async Task<OcorrenciaSincronizacaoDto> SincronizarAsync(CancellationToken ct = default)
    {
        var ocorrencias = await _client.ObterOcorrenciasAsync(ct);
        await _repo.UpsertRangeAsync(ocorrencias);

        var resultado = new OcorrenciaSincronizacaoDto
        {
            Total = ocorrencias.Count,
            Alagamentos = ocorrencias.Count(o => o.Tipo == TipoOcorrenciaAlagamento.ALAGAMENTO),
            Inundacoes = ocorrencias.Count(o => o.Tipo == TipoOcorrenciaAlagamento.INUNDACAO),
        };
        _logger.LogInformation("Sincronização GeoSampa: {Total} ocorrências.", resultado.Total);
        return resultado;
    }
}
