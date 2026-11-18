using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Score;
using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

/// <summary>Risco de alagamento por célula da grade, calculado a cada ciclo e resumido por área.</summary>
public interface IRiscoCelulasService
{
    /// <summary>
    /// Calcula as células da área com a chuva de modelo dela e com a chuva medida da estação
    /// mais próxima de cada trecho (em conferência), a partir do score que o ciclo acabou de
    /// gravar, e guarda o resumo. Só grava quando há o que conferir: a área ou algum trecho
    /// fora do risco baixo. Devolve <c>null</c>, sem gravar, em tempo seco, com tudo em risco
    /// baixo, sem leitura recente, sem células ou quando o retrato daquela leitura já existe.
    /// </summary>
    Task<ResumoCelulas?> RegistrarAsync(Subprefeitura sub, ScorePerigo score, CancellationToken ct = default);

    /// <summary>
    /// O alagamento oficial da área: o meio-termo dos trechos dela, cada um com a chuva de
    /// modelo da área e, onde há estação a até 5 km, a chuva medida ("a medida manda").
    /// <c>null</c> quando a área não tem trechos na grade: vale a conta pela área inteira.
    /// </summary>
    Task<AlagamentoArea?> AlagamentoDaAreaAsync(string nomeArea, EntradaScore entrada, CancellationToken ct = default);

    /// <summary>
    /// O risco de alagamento de cada trecho agora, pela mesma conta do score da área. Área
    /// sem leitura nas últimas 48 h fica de fora. Área de cidade escondida só entra com
    /// <paramref name="incluirOcultas"/> (Admin).
    /// </summary>
    Task<CelulasAgoraDto> AgoraAsync(bool incluirOcultas = false, CancellationToken ct = default);

    /// <summary>Apaga os resumos mais antigos que a retenção. Devolve quantos apagou.</summary>
    Task<int> PodarAsync(CancellationToken ct = default);

    /// <summary>
    /// Compara, por área, o cálculo atual com o meio-termo das células nos últimos
    /// <paramref name="dias"/> dias (1 a 60). As áreas que mais divergem vêm primeiro.
    /// </summary>
    Task<IReadOnlyList<ResumoGradeAreaDto>> ResumirAsync(int dias, CancellationToken ct = default);
}
