using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>Estado atual de uma subprefeitura: o score e a leitura que o gerou.</summary>
public record EstadoSubprefeitura(
    Subprefeitura Subprefeitura,
    ScorePerigo? Score,
    LeituraClimatica? Leitura);

/// <summary>
/// Tudo que os gatilhos podem ler, montado UMA VEZ por subprefeitura pelo motor. Gatilho não
/// consulta banco: recebe contexto e devolve pendências. É isso que os deixa testáveis
/// sem subir ciclo.
/// </summary>
public class ContextoGatilho
{
    public required EstadoSubprefeitura Estado { get; init; }

    /// <summary>Fuso da zona da subprefeitura (até o SP3), já resolvido.</summary>
    public required TimeZoneInfo Fuso { get; init; }

    /// <summary>Faixas futuras da subprefeitura, em ordem crescente.</summary>
    public required IReadOnlyList<FaixaPrevisaoDto> Previsao { get; init; }

    public required DateTime AgoraUtc { get; init; }

    /// <summary>O score do ciclo anterior ao atual; null quando não há. Base do "2 ciclos seguidos".</summary>
    public ScorePerigo? ScoreAnterior { get; init; }

    /// <summary>Pontos do CGE ativos agora na subprefeitura, já filtrados pela validade.</summary>
    public IReadOnlyList<PontoAlagamentoCge> PontosCgeAtivos { get; init; } = [];

    /// <summary>
    /// Chuva horária prevista pelo Open-Meteo, chaveada pela hora UTC. Null quando o Open-Meteo
    /// não respondeu: aí o Vai chover não sai, porque sem a segunda fonte não há confirmação.
    /// </summary>
    public IReadOnlyDictionary<DateTime, double>? ChuvaReferencia { get; init; }

    public Subprefeitura Subprefeitura => Estado.Subprefeitura;

    /// <summary>O estado, se tiver score. Mantém o nome usado pelos gatilhos.</summary>
    public EstadoSubprefeitura? Pior => Estado.Score is null ? null : Estado;
}
