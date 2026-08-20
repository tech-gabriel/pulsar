using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IAlertaRepository : IRepository<Alerta>
{
    Task<Alerta?> ObterComSugestoesAsync(Guid alertaId);
}
