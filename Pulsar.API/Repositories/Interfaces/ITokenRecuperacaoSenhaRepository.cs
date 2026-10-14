using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface ITokenRecuperacaoSenhaRepository
{
    Task AdicionarAsync(TokenRecuperacaoSenha token);

    /// <summary>Busca um token pelo hash, já incluindo o usuário associado.</summary>
    Task<TokenRecuperacaoSenha?> ObterPorTokenHashAsync(string tokenHash);

    /// <summary>Marca como usados todos os tokens ainda válidos de um usuário (garante 1 token ativo por vez).</summary>
    Task InvalidarPendentesDoUsuarioAsync(Guid usuarioId);

    /// <summary>Quantos tokens o usuário pediu desde <paramref name="desde"/> (usados ou não).</summary>
    Task<int> ContarCriadosDesdeAsync(Guid usuarioId, DateTime desde);

    Task SalvarAsync();
}
