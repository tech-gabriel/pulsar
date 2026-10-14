using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Helpers;

/// <summary>Guarda os e-mails "enviados" para os testes lerem o link de confirmação.</summary>
public class CapturaEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<(string Para, string Assunto, string Html)> _enviados = new();

    public IReadOnlyCollection<(string Para, string Assunto, string Html)> Enviados => _enviados;

    public Task EnviarAsync(string destinatario, string assunto, string corpoHtml, CancellationToken ct = default)
    {
        _enviados.Enqueue((destinatario, assunto, corpoHtml));
        return Task.CompletedTask;
    }

    /// <summary>Token bruto do último link de confirmação mandado para <paramref name="email"/>.</summary>
    public string UltimoTokenPara(string email)
    {
        var html = _enviados.Last(e => e.Para.Equals(email.Trim(), StringComparison.OrdinalIgnoreCase)
                                      && e.Html.Contains("confirmar-email")).Html;
        return Uri.UnescapeDataString(Regex.Match(html, "confirmar-email\\?token=([^\"&]+)").Groups[1].Value);
    }
}
