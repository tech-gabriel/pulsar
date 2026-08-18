using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>Estado atual de uma subprefeitura: o score e a leitura que o gerou.</summary>
public record EstadoSubprefeitura(
    Subprefeitura Subprefeitura,
    ScorePerigo? Score,
    LeituraClimatica? Leitura);

/// <summary>
/// Tudo que os gatilhos podem ler, montado UMA VEZ por região pelo motor. Gatilho não
/// consulta banco: recebe contexto e devolve pendências. É isso que os deixa testáveis
/// sem subir ciclo.
/// </summary>
public class ContextoGatilho
{
    public required Regiao Regiao { get; init; }

    /// <summary>Fuso já resolvido de Regiao.FusoHorario, para o gatilho não repetir o lookup.</summary>
    public required TimeZoneInfo Fuso { get; init; }

    public required IReadOnlyList<EstadoSubprefeitura> Subprefeituras { get; init; }

    /// <summary>Faixas futuras da região, agregadas por pior caso, em ordem crescente.</summary>
    public required IReadOnlyList<FaixaPrevisaoDto> Previsao { get; init; }

    public required DateTime AgoraUtc { get; init; }

    /// <summary>Subprefeitura de maior score da região. Null se nenhuma tem score.</summary>
    public EstadoSubprefeitura? Pior => Subprefeituras
        .Where(e => e.Score is not null)
        .OrderByDescending(e => e.Score!.Valor)
        .FirstOrDefault();
}
