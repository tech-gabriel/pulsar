namespace Pulsar.API.External.Interfaces;

/// <summary>
/// Chuva acumulada de uma estação do CEMADEN, em mm, por janela. Janela null = a estação não
/// mandou dado naquela janela (o que é diferente de zero). <paramref name="DataHoraUtc"/> é o
/// instante da consulta no CEMADEN, igual para todas as estações da resposta, e não o horário
/// da leitura da estação.
/// </summary>
public record AcumuladoCemaden(
    string CodEstacao, DateTime DataHoraUtc,
    double? Acc1h, double? Acc3h, double? Acc6h, double? Acc12h, double? Acc24h,
    double? Acc48h, double? Acc72h, double? Acc96h, double? Acc120h);

public record CadastroCemaden(string CodEstacao, string Nome, double Latitude, double Longitude);

public interface ICemadenClient
{
    /// <summary>False sem Cemaden:Email ou Cemaden:Senha: quem chama não deve nem tentar.</summary>
    bool Configurado { get; }

    /// <summary>Todas as estações do município (código do IBGE) numa chamada só.</summary>
    Task<IReadOnlyList<AcumuladoCemaden>> ObterAcumuladosAsync(string codIbge, CancellationToken ct = default);

    Task<IReadOnlyList<CadastroCemaden>> ObterCadastroAsync(string codIbge, CancellationToken ct = default);
}
