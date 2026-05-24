using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IAlertaRepository : IRepository<Alerta>
{
    Task<IEnumerable<Alerta>> ObterRecentesPorRegiaoAsync(Guid regiaoId, int horas = 24);
    Task<Alerta?> ObterComSugestoesAsync(Guid alertaId);
}
