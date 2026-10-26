using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

/// <summary>
/// Lê a página pública de alagamentos do CGE-SP (alagamentos.jsp). Não há API: é HTML, então
/// o parse é por regex sobre as classes CSS da página, conferidas em 2026-10-26. Se o CGE mudar
/// o layout, o parse devolve vazio, e vazio é o lado seguro (nenhum aviso de Perigo sai).
/// </summary>
public partial class CgeAlagamentoClient : ICgeAlagamentoClient
{
    private readonly IHttpClientFactory _httpClientFactory;

    public CgeAlagamentoClient(IHttpClientFactory httpClientFactory) => _httpClientFactory = httpClientFactory;

    public async Task<IReadOnlyList<PontoCgeBruto>> ObterDoDiaAsync(DateOnly dia, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("cgesp");
        var data = dia.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
        var response = await client.GetAsync($"alagamentos.jsp?dataBusca={data}&enviaBusca=Buscar", ct);
        response.EnsureSuccessStatusCode();
        return Parse(await response.Content.ReadAsStringAsync(ct));
    }

    /// <summary>Público e estático para ser testável com o HTML salvo, como o ParseRss.</summary>
    public static IReadOnlyList<PontoCgeBruto> Parse(string html)
    {
        var pontos = new List<PontoCgeBruto>();
        string? subprefeitura = null;

        // A página é uma sequência "subprefeitura, pontos dela, próxima subprefeitura...",
        // então uma passada em ordem basta para saber a que subprefeitura cada ponto pertence.
        foreach (Match m in BlocoRegex().Matches(html))
        {
            if (m.Groups["sub"].Success)
            {
                subprefeitura = Limpar(m.Groups["sub"].Value);
                continue;
            }
            if (subprefeitura is null) continue;

            var bloco = m.Groups["ponto"].Value;
            var status = StatusRegex().Match(bloco);
            var local = LocalRegex().Match(bloco);
            if (!status.Success || !local.Success) continue;

            var horas = HoraRegex().Matches(local.Groups["horario"].Value);
            if (horas.Count == 0) continue;

            var detalhe = DetalheRegex().Match(bloco);
            pontos.Add(new PontoCgeBruto(
                subprefeitura,
                TimeOnly.ParseExact(horas[0].Value, "H:mm", CultureInfo.InvariantCulture),
                horas.Count > 1 ? TimeOnly.ParseExact(horas[1].Value, "H:mm", CultureInfo.InvariantCulture) : null,
                Limpar(local.Groups["via"].Value),
                detalhe.Success ? Limpar(detalhe.Groups["sentido"].Value) : string.Empty,
                detalhe.Success ? Limpar(detalhe.Groups["ref"].Value) : string.Empty,
                Ativo: !status.Groups["inativo"].Success,
                Transitavel: !status.Groups["intransitavel"].Success));
        }
        return pontos;
    }

    private static string Limpar(string texto) => WebUtility.HtmlDecode(texto).Trim();

    [GeneratedRegex("""<td class="bairro[^"]*">\s*(?<sub>[^<]+?)\s*<|<div class="ponto-de-alagamento">(?<ponto>.*?)</div>""", RegexOptions.Singleline)]
    private static partial Regex BlocoRegex();

    [GeneratedRegex(@"<li class=""(?<inativo>in)?ativo-(?<intransitavel>in)?transitavel""")]
    private static partial Regex StatusRegex();

    [GeneratedRegex("""<li class="arial-descr-alag col-local">(?<horario>[^<]*)<br\s*/?>(?<via>[^<]*)</li>""")]
    private static partial Regex LocalRegex();

    [GeneratedRegex("""Sentido:(?<sentido>[^<]*)<br\s*/?>\s*Refer[^:]*:(?<ref>[^<]*)</li>""")]
    private static partial Regex DetalheRegex();

    [GeneratedRegex(@"\d{1,2}:\d{2}")]
    private static partial Regex HoraRegex();
}
