using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IUsuarioRepository : IRepository<Usuario>
{
    Task<Usuario?> ObterPorEmailAsync(string email);
    Task<bool> EmailExisteAsync(string email);
    Task<Usuario?> ObterComFavoritosAsync(Guid id);
}
