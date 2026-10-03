using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface INotificacaoEnviadaRepository
{
    /// <summary>
    /// Envios das pessoas nas últimas N horas: dedup por chave, cooldown e teto diário (o dia
    /// local é calculado fora daqui, convertendo cada EnviadoEm).
    /// </summary>
    Task<IReadOnlyList<NotificacaoEnviada>> ObterRecentesAsync(IReadOnlyCollection<Guid> usuarioIds, int horas);

    /// <summary>Grava as linhas de um push (um SaveChanges). Chave repetida da mesma pessoa lança.</summary>
    Task RegistrarAsync(IReadOnlyList<NotificacaoEnviada> registros);

    Task<int> RemoverAntigasAsync(DateTime limiteUtc);
}
