using System.Net;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

/// <summary>
/// Consome o feed RSS oficial do CGE-SP (Centro de Gerenciamento de Emergências
/// da Prefeitura de São Paulo) em https://www.cgesp.org/v3/feed_rss.jsp.
/// </summary>
public partial class CgespNoticiaClient : INoticiaClient
{
    private const string FeedPath = "feed_rss.jsp";
    private const string BaseSite = "https://www.cgesp.org/v3/";
    private const int ResumoMaxLength = 240;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CgespNoticiaClient> _logger;

    public CgespNoticiaClient(IHttpClientFactory httpClientFactory, ILogger<CgespNoticiaClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IReadOnlyList<NoticiaDto>> ObterNoticiasAsync(CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("cgesp");
        var response = await client.GetAsync(FeedPath, ct);
        response.EnsureSuccessStatusCode();

        var xml = await response.Content.ReadAsStringAsync(ct);
        return ParseRss(xml);
    }

    /// <summary>
    /// Faz o parse do XML RSS 2.0 em uma lista de <see cref="NoticiaDto"/>.
    /// Exposto como método estático para ser testável sem chamadas HTTP.
    /// </summary>
    public static IReadOnlyList<NoticiaDto> ParseRss(string xml)
    {
        if (string.IsNullOrWhiteSpace(xml))
            return [];

        var doc = XDocument.Parse(xml);

        return doc.Descendants("item")
            .Select(item => new NoticiaDto
            {
                Titulo = (item.Element("title")?.Value ?? string.Empty).Trim(),
                Resumo = LimparResumo(item.Element("description")?.Value),
                Link = ResolverLink(item.Element("link")?.Value),
                PublicadoEm = ParsePubDate(item.Element("pubDate")?.Value),
                Fonte = "CGE-SP"
            })
            .Where(n => !string.IsNullOrWhiteSpace(n.Titulo))
            .OrderByDescending(n => n.PublicadoEm)
            .ToList();
    }

    /// <summary>Resolve um link relativo do feed (ex.: "noticias.jsp?id=55070") em URL absoluta.</summary>
    private static string ResolverLink(string? link)
    {
        link = link?.Trim();
        if (string.IsNullOrWhiteSpace(link))
            return BaseSite;
        if (link.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            return link;
        return BaseSite + link.TrimStart('/');
    }

    /// <summary>Remove tags HTML, decodifica entidades e trunca o resumo.</summary>
    private static string LimparResumo(string? descricao)
    {
        if (string.IsNullOrWhiteSpace(descricao))
            return string.Empty;

        var semTags = TagHtmlRegex().Replace(descricao, " ");
        var texto = WebUtility.HtmlDecode(semTags);
        texto = EspacosRegex().Replace(texto, " ").Trim();

        if (texto.Length <= ResumoMaxLength)
            return texto;

        // Trunca sem cortar palavra no meio.
        var corte = texto.LastIndexOf(' ', ResumoMaxLength - 1);
        if (corte <= 0)
            corte = ResumoMaxLength - 1;
        return texto[..corte].TrimEnd() + "…";
    }

    private static readonly Dictionary<string, int> Meses = new(StringComparer.OrdinalIgnoreCase)
    {
        ["jan"] = 1, ["fev"] = 2, ["mar"] = 3, ["abr"] = 4, ["mai"] = 5, ["jun"] = 6,
        ["jul"] = 7, ["ago"] = 8, ["set"] = 9, ["out"] = 10, ["nov"] = 11, ["dez"] = 12
    };

    /// <summary>
    /// Faz o parse do pubDate do CGE, no formato "Ter, 02 jun 2026 08:13:55 GMT"
    /// (dia da semana e mês abreviados em pt-BR). Em caso de falha, usa UtcNow.
    /// </summary>
    private static DateTime ParsePubDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return DateTime.UtcNow;

        var s = raw.Trim();

        // Remove o dia da semana ("Ter,") que atrapalha o parse em pt-BR.
        var virgula = s.IndexOf(',');
        if (virgula >= 0)
            s = s[(virgula + 1)..].Trim();

        s = s.Replace("GMT", "", StringComparison.OrdinalIgnoreCase).Trim();

        var partes = s.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (partes.Length >= 4
            && int.TryParse(partes[0], out var dia)
            && Meses.TryGetValue(partes[1].Trim('.'), out var mes)
            && int.TryParse(partes[2], out var ano)
            && TimeSpan.TryParse(partes[3], out var hora))
        {
            try
            {
                return new DateTime(ano, mes, dia, 0, 0, 0, DateTimeKind.Utc).Add(hora);
            }
            catch (ArgumentOutOfRangeException)
            {
                return DateTime.UtcNow;
            }
        }

        return DateTime.UtcNow;
    }

    [GeneratedRegex("<.*?>", RegexOptions.Singleline)]
    private static partial Regex TagHtmlRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex EspacosRegex();
}
