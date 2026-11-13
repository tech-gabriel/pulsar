using Pulsar.API.Domain.Entities;

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
}
