using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IOcorrenciaAlagamentoRepository
{
    /// <summary>Insere novas ocorrências e atualiza as existentes por (CdIdentificador, Tipo).</summary>
    Task UpsertRangeAsync(IEnumerable<OcorrenciaAlagamento> ocorrencias);

    /// <summary>Ocorrências com DataOcorrencia dentro dos últimos N meses.</summary>
    Task<IReadOnlyList<OcorrenciaAlagamento>> ObterRecentesAsync(int meses = 12);
}
