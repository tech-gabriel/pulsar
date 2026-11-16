namespace Pulsar.API.Domain.Chuva;

/// <param name="Subprefeitura">
/// Nome passado ao AlagamentoCgeService.Casar; null = posto fora da capital (guardado, sem uso).
/// </param>
/// <param name="Lat">Posição do posto, do SAISP/FCTH (local_posto.jsp?REDE=12, mesmo número de posto do CGE), conferida em 2026-11-15.</param>
public record PostoCge(int Id, string Nome, string? Subprefeitura, double Lat, double Lon);

/// <summary>
/// Os postos da lista pública do CGE-SP (estacoes-meteorologicas.jsp), conferida em 2026-11-10.
/// A página do CGE não traz coordenada (ela vem do SAISP, ver PostoCge), e o vínculo com a
/// subprefeitura segue pelo nome. Dentro da
/// mesma subprefeitura a ORDEM é a preferência: o primeiro posto com dado válido vale.
/// PostosCgeTests prova que todo nome casa com o seed.
/// </summary>
public static class PostosCge
{
    public static readonly IReadOnlyList<PostoCge> Todos =
    [
        new(1000887, "Penha", "Penha", -23.530763, -46.528744),
        new(504, "Perus", "Perus", -23.407443, -46.753125),
        new(515, "Pirituba", "Pirituba", -23.488606, -46.72732),
        new(509, "Freguesia do Ó", "Freguesia do Ó", -23.47706, -46.66537),
        new(510, "Santana/Tucuruvi", "Santana/Tucuruvi", -23.511211, -46.619502),
        new(1000944, "Tremembé", "Jaçanã", -23.459841, -46.585572),
        new(1000862, "São Miguel Paulista", "São Miguel Paulista", -23.491511, -46.453618),
        new(1000882, "Itaim Paulista", "Itaim Paulista", -23.49067, -46.43599),
        new(1000844, "São Mateus", "São Mateus", -23.594199, -46.465567),
        new(503, "Sé", "Sé", -23.552718, -46.656168),
        new(1000842, "Butantã", "Butantã", -23.554516, -46.72657),
        new(1000840, "Ipiranga", "Ipiranga", -23.632978, -46.583518),
        new(1000852, "Santo Amaro", "Santo Amaro", -23.634789, -46.667657),
        new(1000850, "M'Boi Mirim", "M'Boi Mirim", -23.671266, -46.727361),
        new(592, "Cidade Ademar", "Cidade Ademar", -23.66767, -46.67416),
        new(507, "Barragem Parelheiros", "Parelheiros", -23.867778, -46.652222),
        new(1000300, "Marsilac", "Parelheiros", -23.916332, -46.727397),
        new(1000848, "Lapa", "Lapa", -23.52556, -46.75083),
        new(1000854, "Campo Limpo", "Campo Limpo", -23.65818, -46.76749),
        new(1000857, "Capela do Socorro", "Capela do Socorro", -23.781945, -46.72947),
        new(846, "Capela do Socorro (Subprefeitura)", "Capela do Socorro", -23.723013, -46.69918),
        new(1000859, "Vila Formosa", "Aricanduva", -23.563309, -46.508798),
        new(1000860, "Mooca", "Mooca", -23.53, -46.59167),
        new(1000864, "Itaquera", "Itaquera", -23.552301, -46.44611),
        new(524, "Vila Prudente", "Vila Prudente", -23.583219, -46.560179),
        new(540, "Vila Maria/Vila Guilherme", "Vila Maria", -23.501611, -46.591534),
        new(495, "Vila Mariana", "Vila Mariana", -23.58472, -46.63556),
        new(634, "Jabaquara", "Jabaquara", -23.650814, -46.646581),
        new(1000635, "Pinheiros", "Pinheiros", -23.551871, -46.695939),
        new(400, "Riacho Grande", null, -23.752079, -46.532528),
        new(1000876, "Mauá", null, -23.668383, -46.466539),
        new(1000880, "Santana do Parnaíba", null, -23.43794, -46.90945),
    ];
}
