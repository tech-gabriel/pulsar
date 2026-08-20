using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;

namespace Pulsar.API.Repositories.Interfaces;

public interface IPrevisaoRepository
{
    /// <summary>Maior ColetadoEm da subprefeitura, ou null se nunca coletou. Alimenta a guarda de idade.</summary>
    Task<DateTime?> ObterUltimaColetaAsync(Guid subprefeituraId);

    /// <summary>Insere ou atualiza todos os pontos da subprefeitura. Salva na hora.</summary>
    Task UpsertLoteAsync(Guid subprefeituraId, IReadOnlyList<PontoPrevisaoDto> pontos, DateTime coletadoEmUtc);

    /// <summary>Apaga pontos da subprefeitura com InstantePrevisto anterior ao limite. Devolve quantos.</summary>
    Task<int> RemoverAntigasAsync(Guid subprefeituraId, DateTime limiteUtc);

    /// <summary>Pontos de todas as subprefeituras da região com InstantePrevisto >= desdeUtc, ordenados.</summary>
    Task<IReadOnlyList<PrevisaoClimatica>> ObterFuturasPorRegiaoAsync(Guid regiaoId, DateTime desdeUtc);
}
