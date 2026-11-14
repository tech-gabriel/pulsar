namespace Pulsar.API.Services.Interfaces;

public interface IAvisoRotaService
{
    /// <summary>Guarda o pedido da pessoa, trocando o anterior se houver.</summary>
    Task RegistrarAsync(Guid usuarioId, IReadOnlyList<Guid> ids, string destino, DateTime agoraUtc,
        Pulsar.API.Services.Rota.CaminhoRota? caminho = null, CancellationToken ct = default);

    Task CancelarAsync(Guid usuarioId, CancellationToken ct = default);

    /// <summary>Reavalia os pedidos: apaga os vencidos e avisa (uma vez) os que melhoraram. Devolve quantos push saíram.</summary>
    Task<int> AvaliarEDispararAsync(DateTime agoraUtc, CancellationToken ct = default);
}
