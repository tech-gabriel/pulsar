using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IAssinaturaPushRepository : IRepository<AssinaturaPush>
{
    /// <summary>Inscrição correspondente a um endpoint (chave natural do navegador).</summary>
    Task<AssinaturaPush?> ObterPorEndpointAsync(string endpoint);

    /// <summary>Inscrições dos usuários que favoritaram a região informada.</summary>
    Task<IEnumerable<AssinaturaPush>> ObterPorRegiaoFavoritaAsync(Guid regiaoId);
}
