using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

/// <summary>Risco de alagamento por célula da grade, calculado a cada ciclo e resumido por área.</summary>
public interface IRiscoCelulasService
{
    /// <summary>
    /// Calcula as células da área com a chuva dela, a partir do score que o ciclo acabou de
    /// gravar, e guarda o resumo. Só grava quando há o que conferir: a área ou algum trecho
    /// fora do risco baixo. Devolve <c>null</c>, sem gravar, em tempo seco, com tudo em risco
    /// baixo, sem leitura recente, sem células ou quando o retrato daquela leitura já existe.
    /// </summary>
    Task<ResumoCelulas?> RegistrarAsync(Subprefeitura sub, ScorePerigo score, CancellationToken ct = default);

    /// <summary>Apaga os resumos mais antigos que a retenção. Devolve quantos apagou.</summary>
    Task<int> PodarAsync(CancellationToken ct = default);

    /// <summary>
    /// Compara, por área, o cálculo atual com o meio-termo das células nos últimos
    /// <paramref name="dias"/> dias (1 a 60). As áreas que mais divergem vêm primeiro.
    /// </summary>
    Task<IReadOnlyList<ResumoGradeAreaDto>> ResumirAsync(int dias, CancellationToken ct = default);
}
