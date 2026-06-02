using System.Text.RegularExpressions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services.Email;

/// <summary>Envia e-mails via SMTP usando MailKit (ex.: Gmail em smtp.gmail.com:587 STARTTLS).</summary>
public partial class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task EnviarAsync(string destinatario, string assunto, string corpoHtml, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Host) || string.IsNullOrWhiteSpace(_options.FromEmail))
            throw new InvalidOperationException("Configuração de e-mail incompleta (Host/FromEmail).");

        var mensagem = MontarMensagem(_options, destinatario, assunto, corpoHtml);
        var secure = _options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.SslOnConnect;

        using var client = new SmtpClient();
        await client.ConnectAsync(_options.Host, _options.Port, secure, ct);

        if (!string.IsNullOrEmpty(_options.User))
            await client.AuthenticateAsync(_options.User, _options.Password, ct);

        await client.SendAsync(mensagem, ct);
        await client.DisconnectAsync(true, ct);

        _logger.LogInformation("E-mail enviado para {Destinatario}: {Assunto}", destinatario, assunto);
    }

    /// <summary>
    /// Monta a <see cref="MimeMessage"/> (From/To/Subject + corpo HTML com fallback texto).
    /// Estático para ser testável sem rede.
    /// </summary>
    public static MimeMessage MontarMensagem(EmailOptions options, string destinatario, string assunto, string corpoHtml)
    {
        var mensagem = new MimeMessage();
        mensagem.From.Add(new MailboxAddress(options.FromName, options.FromEmail));
        mensagem.To.Add(MailboxAddress.Parse(destinatario));
        mensagem.Subject = assunto;

        var builder = new BodyBuilder
        {
            HtmlBody = corpoHtml,
            TextBody = HtmlParaTexto(corpoHtml)
        };
        mensagem.Body = builder.ToMessageBody();

        return mensagem;
    }

    /// <summary>Gera um fallback texto-puro a partir do HTML (remove tags e normaliza espaços).</summary>
    private static string HtmlParaTexto(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
            return string.Empty;

        var semTags = TagHtmlRegex().Replace(html, " ");
        return EspacosRegex().Replace(System.Net.WebUtility.HtmlDecode(semTags), " ").Trim();
    }

    [GeneratedRegex("<.*?>", RegexOptions.Singleline)]
    private static partial Regex TagHtmlRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex EspacosRegex();
}
