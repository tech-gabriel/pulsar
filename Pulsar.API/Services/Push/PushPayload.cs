namespace Pulsar.API.Services.Push;

/// <summary>
/// Conteúdo enviado ao Service Worker do navegador. Serializado em JSON e lido
/// no evento <c>push</c> para montar a notificação exibida ao usuário.
/// </summary>
public record PushPayload(
    string Titulo,
    string Corpo,
    string? Url = null,
    string? Tag = null);
