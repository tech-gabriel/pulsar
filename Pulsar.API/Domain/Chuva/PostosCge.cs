namespace Pulsar.API.Domain.Chuva;

/// <param name="Subprefeitura">
/// Nome passado ao AlagamentoCgeService.Casar; null = posto fora da capital (guardado, sem uso).
/// </param>
public record PostoCge(int Id, string Nome, string? Subprefeitura);

/// <summary>
/// Os postos da lista pública do CGE-SP (estacoes-meteorologicas.jsp), conferida em 2026-11-10.
/// A página não traz coordenada, então o vínculo com a subprefeitura é pelo nome. Dentro da
/// mesma subprefeitura a ORDEM é a preferência: o primeiro posto com dado válido vale.
/// PostosCgeTests prova que todo nome casa com o seed.
/// </summary>
public static class PostosCge
{
    public static readonly IReadOnlyList<PostoCge> Todos =
    [
        new(1000887, "Penha", "Penha"),
        new(504, "Perus", "Perus"),
        new(515, "Pirituba", "Pirituba"),
        new(509, "Freguesia do Ó", "Freguesia do Ó"),
        new(510, "Santana/Tucuruvi", "Santana/Tucuruvi"),
        new(1000944, "Tremembé", "Jaçanã"),
        new(1000862, "São Miguel Paulista", "São Miguel Paulista"),
        new(1000882, "Itaim Paulista", "Itaim Paulista"),
        new(1000844, "São Mateus", "São Mateus"),
        new(503, "Sé", "Sé"),
        new(1000842, "Butantã", "Butantã"),
        new(1000840, "Ipiranga", "Ipiranga"),
        new(1000852, "Santo Amaro", "Santo Amaro"),
        new(1000850, "M'Boi Mirim", "M'Boi Mirim"),
        new(592, "Cidade Ademar", "Cidade Ademar"),
        new(507, "Barragem Parelheiros", "Parelheiros"),
        new(1000300, "Marsilac", "Parelheiros"),
        new(1000848, "Lapa", "Lapa"),
        new(1000854, "Campo Limpo", "Campo Limpo"),
        new(1000857, "Capela do Socorro", "Capela do Socorro"),
        new(846, "Capela do Socorro (Subprefeitura)", "Capela do Socorro"),
        new(1000859, "Vila Formosa", "Aricanduva"),
        new(1000860, "Mooca", "Mooca"),
        new(1000864, "Itaquera", "Itaquera"),
        new(524, "Vila Prudente", "Vila Prudente"),
        new(540, "Vila Maria/Vila Guilherme", "Vila Maria"),
        new(495, "Vila Mariana", "Vila Mariana"),
        new(634, "Jabaquara", "Jabaquara"),
        new(1000635, "Pinheiros", "Pinheiros"),
        new(400, "Riacho Grande", null),
        new(1000876, "Mauá", null),
        new(1000880, "Santana do Parnaíba", null),
    ];
}
