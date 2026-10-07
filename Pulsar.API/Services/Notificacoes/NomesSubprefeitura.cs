using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Nome da subprefeitura com a preposição certa para a copy do push ("na Mooca",
/// "no Ipiranga"). Espelha PREPOSICAO de pulsar-web/src/data/regioes-seo.ts; quem não
/// está na tabela leva "em" ("em Itaquera"), que é o correto para nome sem artigo.
/// </summary>
public static class NomesSubprefeitura
{
    private static readonly Dictionary<string, string> Preposicao = new()
    {
        ["Sé"] = "na", ["Itaim Paulista"] = "no", ["Mooca"] = "na", ["Penha"] = "na",
        ["Vila Prudente"] = "na", ["Casa Verde-Limão-Cachoeirinha"] = "na",
        ["Freguesia-Brasilândia"] = "na", ["Jaçanã-Tremembé"] = "no",
        ["Vila Maria-Vila Guilherme"] = "na", ["Butantã"] = "no", ["Lapa"] = "na",
        ["Campo Limpo"] = "no", ["Capela do Socorro"] = "na", ["Cidade Ademar"] = "na",
        ["Ipiranga"] = "no", ["Jabaquara"] = "no", ["M'Boi Mirim"] = "no", ["Vila Mariana"] = "na",
    };

    public static IReadOnlyCollection<string> NomesComPreposicao => Preposicao.Keys;

    public static string ComPreposicao(string nome)
        => $"{(Preposicao.TryGetValue(nome, out var p) ? p : "em")} {nome}";

    /// <summary>
    /// Slug da subprefeitura para o deep link /app?regiao=. Espelha slugify de
    /// pulsar-web/src/data/regioes-seo.ts (NFD sem acento, apóstrofo some, o resto vira hífen).
    /// </summary>
    public static string Slug(string nome)
    {
        var semAcento = new string(nome.Normalize(NormalizationForm.FormD)
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .ToArray());
        return Regex.Replace(semAcento.Replace("'", "").ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
    }

    /// <summary>Destino do push de UMA subprefeitura: abre o detalhe com as dicas.</summary>
    public static string UrlDetalhe(string nome) => $"/app?regiao={Slug(nome)}";
}
