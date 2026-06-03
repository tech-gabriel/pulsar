namespace Pulsar.API.Services.Email;

/// <summary>
/// Configuração do envio de e-mail (seção "Email"). A credencial (ApiKey)
/// deve ficar em User Secrets — NUNCA em appsettings versionado.
/// </summary>
public class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>"Resend" (API HTTP) ou "Log" (apenas registra no console — dev).</summary>
    public string Provider { get; set; } = "Log";

    /// <summary>Token da API do Resend (Provider="Resend"). Só em User Secrets.</summary>
    public string ApiKey { get; set; } = string.Empty;

    public string FromName { get; set; } = "Pulsar";
    public string FromEmail { get; set; } = string.Empty;
}
