using Microsoft.Extensions.Options;
using Pulsar.API.Services.Interfaces;
using Resend;

namespace Pulsar.API.Services.Email;

/// <summary>
/// Envia e-mails via API HTTP do Resend (resend.com). Provider="Resend".
/// Mais simples e profissional que SMTP: só precisa de um ApiKey (User Secrets)
/// e de um remetente em domínio verificado (ou onboarding@resend.dev em dev).
/// </summary>
public class ResendEmailSender : IEmailSender
{
    private readonly IResend _resend;
    private readonly EmailOptions _options;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(IResend resend, IOptions<EmailOptions> options, ILogger<ResendEmailSender> logger)
    {
        _resend = resend;
        _options = options.Value;
        _logger = logger;
    }

    public async Task EnviarAsync(string destinatario, string assunto, string corpoHtml, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey) || string.IsNullOrWhiteSpace(_options.FromEmail))
            throw new InvalidOperationException("Configuração de e-mail incompleta (ApiKey/FromEmail).");

        var mensagem = MontarMensagem(_options, destinatario, assunto, corpoHtml);
        var resposta = await _resend.EmailSendAsync(mensagem, ct);

        _logger.LogInformation(
            "E-mail enviado via Resend para {Destinatario}: {Assunto} (id={Id})",
            destinatario, assunto, resposta.Content);
    }

    /// <summary>
    /// Monta a <see cref="EmailMessage"/> (From/To/Subject + HTML com fallback texto).
    /// Estático para ser testável sem rede.
    /// </summary>
    public static EmailMessage MontarMensagem(EmailOptions options, string destinatario, string assunto, string corpoHtml)
    {
        var mensagem = new EmailMessage
        {
            From = $"{options.FromName} <{options.FromEmail}>",
            Subject = assunto,
            HtmlBody = corpoHtml,
            TextBody = EmailHtml.ParaTexto(corpoHtml)
        };
        mensagem.To.Add(destinatario);

        return mensagem;
    }
}
