using System.Globalization;
using System.Xml;
using System.Xml.Linq;
using Pulsar.API.Domain.Alertas;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

/// <summary>
/// Feed nacional de alertas da Defesa Civil (IDAP, MIDR): Atom com um alerta CAP 1.2 em cada
/// entrada, conferido em 18/11/2026 (https://idapfile.mdr.gov.br/idap/api/rss/cap). Público,
/// sem login, cerca de 13,6 MB por leitura e só as últimas ~12 h. Detalhes em
/// docs/FONTES-DE-DADOS.md. Falha devolve null: sem alerta novo, nunca alerta inventado.
/// </summary>
public class IdapClient : IIdapClient
{
    public const string NomeHttp = "idap";
    private static readonly XNamespace Cap = "urn:oasis:names:tc:emergency:cap:1.2";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<IdapClient> _logger;

    public IdapClient(IHttpClientFactory httpClientFactory, ILogger<IdapClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AlertaCap>?> ObterAsync(CancellationToken ct = default)
    {
        try
        {
            var http = _httpClientFactory.CreateClient(NomeHttp);
            using var resposta = await http.GetAsync("idap/api/rss/cap", HttpCompletionOption.ResponseHeadersRead, ct);
            resposta.EnsureSuccessStatusCode();
            await using var corpo = await resposta.Content.ReadAsStreamAsync(ct);
            return Parse(corpo);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or XmlException)
        {
            if (ct.IsCancellationRequested) throw;
            _logger.LogWarning("Feed da IDAP indisponível: {Tipo}: {Mensagem}", ex.GetType().Name, ex.Message);
            return null;
        }
    }

    /// <summary>
    /// Lê o feed em streaming, um alerta por vez. Só alertas à população (status Actual, scope
    /// Public) com bloco info; a entrada malformada é descartada sem levar as outras.
    /// </summary>
    public static IReadOnlyList<AlertaCap> Parse(Stream xml)
    {
        var alertas = new List<AlertaCap>();
        using var leitor = XmlReader.Create(xml, new XmlReaderSettings { IgnoreComments = true, DtdProcessing = DtdProcessing.Prohibit });
        leitor.MoveToContent();
        while (!leitor.EOF)
        {
            if (leitor.NodeType == XmlNodeType.Element && leitor.LocalName == "alert" && leitor.NamespaceURI == Cap.NamespaceName)
            {
                var alerta = (XElement)XNode.ReadFrom(leitor);
                if (Converter(alerta) is { } a) alertas.Add(a);
            }
            else leitor.Read();
        }
        return alertas;
    }

    private static AlertaCap? Converter(XElement a)
    {
        string T(XElement? e, string nome) => e?.Element(Cap + nome)?.Value.Trim() ?? "";
        if (T(a, "status") != "Actual" || T(a, "scope") != "Public") return null;
        var info = a.Element(Cap + "info");
        if (info is null) return null;
        if (!Data(T(a, "sent"), out var enviado) || !Data(T(info, "onset"), out var inicio) || !Data(T(info, "expires"), out var expira))
            return null;

        var areas = info.Elements(Cap + "area").ToList();
        var poligonos = areas.SelectMany(ar => ar.Elements(Cap + "polygon"))
            .Select(p => Poligono(p.Value)).Where(p => p.Count >= 4).ToList();
        var ibge = areas.SelectMany(ar => ar.Elements(Cap + "geocode"))
            .Where(g => T(g, "valueName").Equals("IBGE", StringComparison.OrdinalIgnoreCase))
            .Select(g => T(g, "value")).Where(v => v.Length > 0).Distinct().ToList();
        // references: "remetente,identificador,enviado" separados por espaço.
        var referencias = T(a, "references").Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(r => r.Split(',')).Where(p => p.Length >= 2).Select(p => p[1]).ToList();

        return new AlertaCap(T(a, "identifier"), T(a, "sender"), enviado, T(a, "msgType"), referencias,
            T(info, "event"), T(info, "severity"), T(info, "urgency"), inicio, expira,
            T(info, "senderName"), T(info, "headline"), T(info, "description"), poligonos, ibge, T(info, "instruction"));
    }

    private static bool Data(string s, out DateTime utc)
    {
        var ok = DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d);
        utc = ok ? d.UtcDateTime : default;
        return ok;
    }

    private static IReadOnlyList<(double Lat, double Lon)> Poligono(string texto)
    {
        var pontos = new List<(double, double)>();
        foreach (var par in texto.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
        {
            var xy = par.Split(',');
            if (xy.Length != 2
                || !double.TryParse(xy[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)
                || !double.TryParse(xy[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lon))
                return [];
            pontos.Add((lat, lon));
        }
        return pontos;
    }
}
