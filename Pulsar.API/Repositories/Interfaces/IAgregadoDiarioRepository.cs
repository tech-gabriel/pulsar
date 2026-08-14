using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IAgregadoDiarioRepository
{
    Task<AgregadoDiario?> ObterPorDiaAsync(Guid subprefeituraId, DateOnly dia);

    /// <summary>Insere ou atualiza a linha de (subprefeitura, dia). Salva na hora.</summary>
    Task UpsertAsync(AgregadoDiario agregado);

    /// <summary>Linhas dos últimos N dias, mais recentes primeiro, com subprefeitura e região carregadas.</summary>
    Task<IReadOnlyList<AgregadoDiario>> ObterRecentesAsync(int dias);
}
