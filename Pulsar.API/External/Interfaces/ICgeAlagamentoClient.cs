namespace Pulsar.API.External.Interfaces;

/// <summary>Um ponto como a página do CGE-SP publica: hora local e nome de subprefeitura do CGE.</summary>
public record PontoCgeBruto(
    string NomeSubprefeitura,
    TimeOnly Inicio,
    TimeOnly? Fim,
    string Via,
    string Sentido,
    string Referencia,
    bool Ativo,
    bool Transitavel);

public interface ICgeAlagamentoClient
{
    /// <summary>Pontos de alagamento do dia local pedido. Lança se a página não responder.</summary>
    Task<IReadOnlyList<PontoCgeBruto>> ObterDoDiaAsync(DateOnly dia, CancellationToken ct = default);
}
