using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Interfaces;

public interface IPushNotificationService
{
    /// <summary>True quando há chaves VAPID configuradas e o push pode ser enviado.</summary>
    bool Habilitado { get; }

    /// <summary>Chave pública VAPID a entregar ao frontend (null se desativado).</summary>
    string? ChavePublica { get; }

    /// <summary>
    /// Notifica os usuários que favoritaram a região e optaram pelo critério informado.
    /// Inscrições mortas (404/410) são removidas. Retorna quantas notificações foram enviadas.
    /// </summary>
    Task<int> NotificarRegiaoAsync(Guid regiaoId, CriterioOptIn criterio, PushPayload payload, CancellationToken ct = default);
}
