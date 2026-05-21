using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface ILeituraRepository : IRepository<LeituraClimatica>
{
    Task<IEnumerable<LeituraClimatica>> ObterHistoricoAsync(Guid subprefeituraId, int horas = 24);
    Task LimparHistoricoAntigoAsync(Guid subprefeituraId, int horas = 24);
}
