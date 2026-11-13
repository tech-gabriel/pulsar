using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

/// <summary>Risco de alagamento por célula da grade, calculado a cada ciclo e resumido por área.</summary>
public interface IRiscoCelulasService
{
    /// <summary>
    /// Calcula as células da área com a chuva dela e grava o resumo do ciclo. Devolve
    /// <c>null</c>, sem gravar, quando a área não tem leitura recente ou não tem células.
    /// </summary>
    Task<ResumoCelulas?> RegistrarAsync(Guid subprefeituraId, CancellationToken ct = default);

    /// <summary>Apaga os resumos mais antigos que a retenção. Devolve quantos apagou.</summary>
    Task<int> PodarAsync(CancellationToken ct = default);

    /// <summary>
    /// Compara, por área, o cálculo atual com o meio-termo das células nos últimos
    /// <paramref name="dias"/> dias (1 a 60). As áreas que mais divergem vêm primeiro.
    /// </summary>
    Task<IReadOnlyList<ResumoGradeAreaDto>> ResumirAsync(int dias, CancellationToken ct = default);
}
