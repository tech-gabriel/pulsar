using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

/// <summary>
/// Lê a página pública de um posto meteorológico do CGE-SP (estacao.jsp). Não há API: é HTML,
/// conferido em 2026-11-10. Sem a chuva do período o parse devolve null, e null é o lado seguro
/// (a região cai para "estimado"). O histórico de 24 h (processo_cge.jsp) recusa acesso direto
/// e não é usado.
/// </summary>
public partial class CgeEstacaoClient : ICgeEstacaoClient
{
    private readonly IHttpClientFactory _httpClientFactory;

    public CgeEstacaoClient(IHttpClientFactory httpClientFactory) => _httpClientFactory = httpClientFactory;

    public async Task<EstacaoCgeBruta?> ObterAsync(int posto, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("cgesp");
        var response = await client.GetAsync($"estacao.jsp?POSTO={posto}", ct);
        response.EnsureSuccessStatusCode();
        return Parse(await response.Content.ReadAsStringAsync(ct));
    }

    /// <summary>Público e estático para ser testável com o HTML salvo, como o do alagamento.</summary>
    public static EstacaoCgeBruta? Parse(string html)
    {
        // Sem tags e sem entidades sobra "Rótulo: valor unidade". O rótulo "Atual:" se repete
        // em temperatura, umidade e pressão, então quem distingue é a unidade.
        var texto = WebUtility.HtmlDecode(TagRegex().Replace(html, " "));

        if (Numero(texto, @"Per\. Atual:\s*([\d.]+)\s*mm") is not { } atual
            || Numero(texto, @"Per\. Anterior:\s*([\d.]+)\s*mm") is not { } anterior)
            return null;

        var zeramento = Regex.Match(texto, @"Zeramento:\s*(\d{1,2}:\d{2}:\d{2})");
        var direcao = Regex.Match(texto, @"Direção:\s*([A-Z]{1,3})\b");

        return new EstacaoCgeBruta(
            atual, anterior,
            zeramento.Success ? TimeOnly.ParseExact(zeramento.Groups[1].Value, "H:mm:ss", CultureInfo.InvariantCulture) : null,
            Numero(texto, @"Atual:\s*(-?[\d.]+)\s*°C"),
            Numero(texto, @"Atual:\s*([\d.]+)\s*%"),
            direcao.Success ? direcao.Groups[1].Value : null,
            Numero(texto, @"Velocidade:\s*([\d.]+)\s*km/h"),
            Numero(texto, @"Rajada:\s*([\d.]+)\s*km/h"),
            Numero(texto, @"Atual:\s*([\d.]+)\s*hPa"));
    }

    private static double? Numero(string texto, string padrao)
    {
        var m = Regex.Match(texto, padrao);
        return m.Success && double.TryParse(m.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var v)
            ? v : null;
    }

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex TagRegex();
}
