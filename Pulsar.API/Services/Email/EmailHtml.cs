using System.Net;
using System.Text.RegularExpressions;

namespace Pulsar.API.Services.Email;

/// <summary>Utilitários de conteúdo para e-mail compartilhados entre os senders.</summary>
public static partial class EmailHtml
{
    /// <summary>Gera um fallback texto-puro a partir do HTML (remove tags e normaliza espaços).</summary>
    public static string ParaTexto(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
            return string.Empty;

        var semTags = TagHtmlRegex().Replace(html, " ");
        return EspacosRegex().Replace(WebUtility.HtmlDecode(semTags), " ").Trim();
    }

    [GeneratedRegex("<.*?>", RegexOptions.Singleline)]
    private static partial Regex TagHtmlRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex EspacosRegex();
}
