using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
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

    public async Task<int> NotificarRegiaoAsync(Guid regiaoId, FaixaRisco faixa, PushPayload payload, CancellationToken ct = default)
    {
        if (!Habilitado)
            return 0;

        var assinaturas = (await _repo.ObterPorRegiaoFavoritaAsync(regiaoId))
            .Where(a => OptouPelaFaixa(a, faixa))
            .ToList();

        if (assinaturas.Count == 0)
            return 0;

        var json = JsonSerializer.Serialize(payload, JsonOpts);
        var client = new WebPushClient();
        var enviados = 0;

        foreach (var assinatura in assinaturas)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                var sub = new WebPush.PushSubscription(assinatura.Endpoint, assinatura.P256dh, assinatura.Auth);
                await client.SendNotificationAsync(sub, json, _vapid);
                enviados++;
            }
            catch (WebPushException ex) when (
                ex.StatusCode == HttpStatusCode.Gone || ex.StatusCode == HttpStatusCode.NotFound)
            {
                // Inscrição expirada/cancelada no navegador: remove para não tentar de novo.
                await _repo.RemoverAsync(assinatura);
                await _repo.SalvarAsync();
                _logger.LogInformation("Inscrição de push removida (endpoint inativo).");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao enviar push para uma inscrição.");
            }
        }

        return enviados;
    }

    private static bool OptouPelaFaixa(AssinaturaPush a, FaixaRisco faixa) => faixa switch
    {
        FaixaRisco.ALTO => a.AlertaAlto,
        FaixaRisco.MODERADO => a.AlertaModerado,
        _ => false
    };
}
