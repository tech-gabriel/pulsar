namespace Pulsar.API.Services.Interfaces;

/// <summary>Abstrai o envio de e-mails, isolando o transporte (SMTP, log, etc.).</summary>
public interface IEmailSender
{
    /// <summary>Envia um e-mail HTML para um destinatário.</summary>
    Task EnviarAsync(string destinatario, string assunto, string corpoHtml, CancellationToken ct = default);
}
