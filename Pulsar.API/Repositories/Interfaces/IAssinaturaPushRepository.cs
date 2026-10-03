using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IAssinaturaPushRepository : IRepository<AssinaturaPush>
{
    /// <summary>Inscrição correspondente a um endpoint (chave natural do navegador).</summary>
    Task<AssinaturaPush?> ObterPorEndpointAsync(string endpoint);

    /// <summary>Todas as inscrições (aparelhos) da pessoa.</summary>
    Task<IReadOnlyList<AssinaturaPush>> ObterPorUsuarioAsync(Guid usuarioId);
}
