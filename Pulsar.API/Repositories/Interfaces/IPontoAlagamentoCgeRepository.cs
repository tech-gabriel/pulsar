using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IPontoAlagamentoCgeRepository
{
    /// <summary>Pontos ativos que a página do CGE confirmou desde o instante pedido.</summary>
    Task<IReadOnlyList<PontoAlagamentoCge>> ObterAtivosAsync(DateTime vistoDesde, CancellationToken ct = default);
}
