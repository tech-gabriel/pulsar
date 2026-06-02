using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services.Email;

/// <summary>
/// Remetente de desenvolvimento: em vez de enviar de verdade, registra o e-mail
/// no log. Permite desenvolver/testar fluxos (ex.: recuperação de senha) sem
/// configurar SMTP. Selecionado quando Email:Provider != "Smtp".
/// </summary>
public class LogEmailSender : IEmailSender
{
    private readonly ILogger<LogEmailSender> _logger;

    public LogEmailSender(ILogger<LogEmailSender> logger) => _logger = logger;

    public Task EnviarAsync(string destinatario, string assunto, string corpoHtml, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "📧 [DEV] E-mail simulado (não enviado)\n  Para: {Destinatario}\n  Assunto: {Assunto}\n  --- Corpo ---\n{Corpo}\n  -------------",
            destinatario, assunto, corpoHtml);

        return Task.CompletedTask;
    }
}
