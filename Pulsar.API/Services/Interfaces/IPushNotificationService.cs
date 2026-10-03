using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Interfaces;

public interface IPushNotificationService
{
    /// <summary>True quando há chaves VAPID configuradas e o push pode ser enviado.</summary>
    bool Habilitado { get; }

    /// <summary>Chave pública VAPID a entregar ao frontend (null se desativado).</summary>
    string? ChavePublica { get; }

    /// <summary>
    /// Envia para os aparelhos da pessoa que optaram pelo critério. Inscrições mortas
    /// (404/410/403) são removidas. Devolve quantos aparelhos receberam.
    /// </summary>
    Task<int> NotificarUsuarioAsync(Guid usuarioId, CriterioOptIn criterio, PushPayload payload, CancellationToken ct = default);
}
