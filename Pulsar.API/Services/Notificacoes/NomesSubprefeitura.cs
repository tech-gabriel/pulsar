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
}
