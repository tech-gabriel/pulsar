using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface ILeituraRepository : IRepository<LeituraClimatica>
{
    Task<IEnumerable<LeituraClimatica>> ObterHistoricoAsync(Guid subprefeituraId, int horas = 24);
    /// <summary>
    /// Apaga leituras mais antigas que N horas. O padrão de 72h é o que sustenta o
    /// agregado diário, que recalcula hoje e ontem a cada ciclo.
    /// </summary>
    Task LimparHistoricoAntigoAsync(Guid subprefeituraId, int horas = 72);
}
