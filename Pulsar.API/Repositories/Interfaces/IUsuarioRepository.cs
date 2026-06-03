using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IUsuarioRepository : IRepository<Usuario>
{
    Task<Usuario?> ObterPorEmailAsync(string email);
    Task<bool> EmailExisteAsync(string email);
    Task<Usuario?> ObterComFavoritosAsync(Guid id);

    /// <summary>
    /// Insere um favorito (join) de forma explícita. Necessário porque adicionar
    /// via navegação (usuario.Favoritos.Add) em um usuário já carregado faz o EF
    /// tratar a chave Guid pré-preenchida como linha existente → UPDATE (0 linhas).
    /// </summary>
    Task AdicionarFavoritoAsync(UsuarioRegiao favorito);
}
