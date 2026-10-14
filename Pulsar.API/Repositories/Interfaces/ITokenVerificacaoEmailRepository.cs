using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface ITokenVerificacaoEmailRepository
{
    Task AdicionarAsync(TokenVerificacaoEmail token);

    /// <summary>Busca pelo hash, já com o usuário.</summary>
    Task<TokenVerificacaoEmail?> ObterPorTokenHashAsync(string tokenHash);

    /// <summary>Marca como usados os tokens ainda válidos do usuário (só o último link vale).</summary>
    Task InvalidarPendentesDoUsuarioAsync(Guid usuarioId);

    /// <summary>Quantos tokens o usuário pediu desde <paramref name="desde"/> (usados ou não).</summary>
    Task<int> ContarCriadosDesdeAsync(Guid usuarioId, DateTime desde);

    Task SalvarAsync();
}
