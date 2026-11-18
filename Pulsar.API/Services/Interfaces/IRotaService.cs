using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IRotaService
{
    /// <exception cref="ArgumentException">Ids repetidos ou que não são de subprefeituras ativas.</exception>
    /// <param name="caminho">Com ele, o alagamento de cada área é lido nos trechos por onde o caminho passa. Null = pela área inteira.</param>
    /// <param name="incluirOcultas">Admin: a cidade escondida (Baixada antes da abertura) entra no caminho.</param>
    Task<RotaAvaliacaoDto> AvaliarAsync(IReadOnlyList<Guid> ids, Pulsar.API.Services.Rota.CaminhoRota? caminho = null, CancellationToken ct = default, bool incluirOcultas = false);
}
