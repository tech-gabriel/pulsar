using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface IAgregadoHorarioRepository
{
    /// <summary>Insere ou atualiza a linha de (subprefeitura, hora). Salva na hora.</summary>
    Task UpsertAsync(AgregadoHorario agregado);
}
