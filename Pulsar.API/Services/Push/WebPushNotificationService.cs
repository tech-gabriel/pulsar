using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;
using WebPush;

namespace Pulsar.API.Services.Push;

/// <summary>
/// Envio de Web Push via VAPID (protocolo Push API/RFC 8030). Gated por config:
/// sem chaves VAPID o serviço fica inerte (<see cref="Habilitado"/> = false) e
/// nenhuma notificação é enviada.
/// </summary>
public class WebPushNotificationService : IPushNotificationService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    // Reutilizado entre chamadas: o WebPushClient encapsula um HttpClient, que é
    // thread-safe e não deve ser recriado a cada envio (evita churn de sockets).
    private static readonly WebPushClient SharedClient = new();

    private readonly IAssinaturaPushRepository _repo;
    private readonly ILogger<WebPushNotificationService> _logger;
    private readonly VapidDetails? _vapid;
    private readonly string? _chavePublica;

    public WebPushNotificationService(
        IAssinaturaPushRepository repo,
        IOptions<PushOptions> options,
        ILogger<WebPushNotificationService> logger)
    {
        _repo = repo;
        _logger = logger;

        var opt = options.Value;
        if (!string.IsNullOrWhiteSpace(opt.PublicKey) && !string.IsNullOrWhiteSpace(opt.PrivateKey))
        {
            _vapid = new VapidDetails(opt.Subject, opt.PublicKey, opt.PrivateKey);
            _chavePublica = opt.PublicKey;
        }
        else
        {
            _logger.LogWarning("Web Push desativado: chaves VAPID (Push:PublicKey/PrivateKey) não configuradas.");
        }
    }

    public bool Habilitado => _vapid is not null;

    public string? ChavePublica => _chavePublica;

    public async Task<int> NotificarRegiaoAsync(Guid regiaoId, CriterioOptIn criterio, PushPayload payload, CancellationToken ct = default)
    {
        if (!Habilitado)
            return 0;

        var assinaturas = (await _repo.ObterPorRegiaoFavoritaAsync(regiaoId))
            .Where(a => OptouPeloCriterio(a, criterio))
            .ToList();

        if (assinaturas.Count == 0)
            return 0;

        var json = JsonSerializer.Serialize(payload, JsonOpts);
        var enviados = 0;
        var mortas = new List<AssinaturaPush>();

        foreach (var assinatura in assinaturas)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var sub = new WebPush.PushSubscription(assinatura.Endpoint, assinatura.P256dh, assinatura.Auth);
                await SharedClient.SendNotificationAsync(sub, json, _vapid);
                enviados++;
            }
            catch (WebPushException ex) when (
                ex.StatusCode == HttpStatusCode.Gone ||
                ex.StatusCode == HttpStatusCode.NotFound ||
                ex.StatusCode == HttpStatusCode.Forbidden)
            {
                // Inscrição inválida: expirada/cancelada (404/410) ou presa a uma
                // chave VAPID antiga (403). Marca para remover — o cliente refaz a
                // inscrição com a chave atual na próxima ativação.
                mortas.Add(assinatura);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao enviar push para uma inscrição.");
            }
        }

        if (mortas.Count > 0)
        {
            foreach (var morta in mortas)
                await _repo.RemoverAsync(morta);
            await _repo.SalvarAsync();
            _logger.LogInformation("{Total} inscrição(ões) de push removida(s) (endpoint inativo/chave antiga).", mortas.Count);
        }

        return enviados;
    }

    /// <summary>
    /// Público e estático para ser testável direto. Mapeia o critério de envio para a
    /// coluna de preferência correspondente da inscrição.
    /// </summary>
    public static bool OptouPeloCriterio(AssinaturaPush a, CriterioOptIn criterio) => criterio switch
    {
        CriterioOptIn.RiscoAlto => a.AlertaAlto,
        CriterioOptIn.RiscoModerado => a.AlertaModerado,
        CriterioOptIn.ResumoDiario => a.ResumoDiario,
        _ => false
    };
}
