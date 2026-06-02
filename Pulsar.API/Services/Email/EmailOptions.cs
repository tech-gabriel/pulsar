namespace Pulsar.API.Services.Email;

/// <summary>
/// Configuração do envio de e-mail (seção "Email"). Credenciais (User/Password)
/// devem ficar em User Secrets — NUNCA em appsettings versionado.
/// </summary>
public class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>"Smtp" para envio real (MailKit) ou "Log" para apenas registrar no console (dev).</summary>
    public string Provider { get; set; } = "Log";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;

    /// <summary>true = STARTTLS (porta 587); false = SSL direto (porta 465).</summary>
    public bool UseStartTls { get; set; } = true;

    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    public string FromName { get; set; } = "Pulsar";
    public string FromEmail { get; set; } = string.Empty;
}
