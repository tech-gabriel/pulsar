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
            // GetString baixa o corpo inteiro sob o Timeout do HttpClient. Com ResponseHeadersRead o
            // limite parava no cabeçalho, e um servidor que trava no meio do corpo congelava o job.
            var xml = await http.GetStringAsync("idap/api/rss/cap", ct);
            if (!xml.Contains("<feed", StringComparison.Ordinal))
            {
                _logger.LogWarning("Feed da IDAP veio sem <feed> ({Tamanho} caracteres): tratado como indisponível.", xml.Length);
                return null;
            }
            var alertas = Parse(xml, out var quebradas);
            if (quebradas > 0)
                _logger.LogWarning("Feed da IDAP: {Quebradas} entrada(s) com XML quebrado descartada(s); as outras seguem.", quebradas);
            return alertas;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or IOException)
        {
            if (ct.IsCancellationRequested) throw;
            _logger.LogWarning("Feed da IDAP indisponível: {Tipo}: {Mensagem}", ex.GetType().Name, ex.Message);
            return null;
        }
    }

    public static IReadOnlyList<AlertaCap> Parse(Stream xml)
    {
        using var leitor = new StreamReader(xml);
        return Parse(leitor.ReadToEnd(), out _);
    }

    /// <summary>
    /// Lê o feed com o leitor XML, um alerta CAP por vez (nome e namespace conferidos: um "&lt;alert"
    /// dentro de CDATA ou comentário é texto, nunca alerta). XML quebrado numa entrada (um "&amp;" sem
    /// escape, um caractere de controle) derruba só ela: a leitura recomeça na próxima &lt;entry&gt;
    /// depois do erro. O feed vem do mais antigo para o mais novo, então parar no erro perderia os
    /// alertas novos. Só alertas à população (status Actual, scope Public) com bloco info.
    /// </summary>
    public static IReadOnlyList<AlertaCap> Parse(string xml, out int quebradas)
    {
        var alertas = new List<AlertaCap>();
        quebradas = 0;
        var fimDoFeed = xml.LastIndexOf("</feed>", StringComparison.Ordinal);
        if (fimDoFeed < 0) fimDoFeed = xml.Length;
        int? retomada = null; // depois de um erro: posição da próxima <entry>, lida como fragmento
        while (true)
        {
            var trecho = retomada is { } r ? xml[r..fimDoFeed] : xml;
            try
            {
                using var leitor = XmlReader.Create(new StringReader(trecho), new XmlReaderSettings
                {
                    IgnoreComments = true, DtdProcessing = DtdProcessing.Prohibit,
                    ConformanceLevel = retomada is null ? ConformanceLevel.Document : ConformanceLevel.Fragment,
                });
                leitor.MoveToContent();
                while (!leitor.EOF)
                {
                    if (leitor.NodeType == XmlNodeType.Element && leitor.LocalName == "alert" && leitor.NamespaceURI == Cap.NamespaceName)
                    {
                        if (Converter((XElement)XNode.ReadFrom(leitor)) is { } a) alertas.Add(a);
                    }
                    else leitor.Read();
                }
                return alertas;
            }
            catch (XmlException e)
            {
                quebradas++;
                var inicio = retomada ?? 0;
                var erro = inicio + Posicao(trecho, e.LineNumber, e.LinePosition);
                var proxima = xml.IndexOf("<entry", Math.Max(erro, inicio + 1), StringComparison.Ordinal);
                if (proxima < 0 || proxima >= fimDoFeed) return alertas;
                retomada = proxima;
            }
        }
    }

    /// <summary>Posição no texto da linha e coluna (contadas a partir de 1) de um erro do leitor XML.</summary>
    private static int Posicao(string texto, int linha, int coluna)
    {
        var i = 0;
        for (var l = 1; l < linha; l++)
        {
            i = texto.IndexOf('\n', i);
            if (i < 0) return texto.Length;
            i++;
        }
        return Math.Min(texto.Length, i + Math.Max(0, coluna - 1));
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
