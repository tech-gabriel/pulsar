using Pulsar.API.Domain.Entities;

namespace Pulsar.API.Repositories.Interfaces;

public interface INotificacaoEnviadaRepository
{
    /// <summary>Dedup por chave exata (chuva prevista, briefing).</summary>
    Task<bool> ExisteChaveAsync(string chave);

    /// <summary>Dedup por cooldown deslizante (score alto): já houve envio deste gatilho desde X?</summary>
    Task<bool> ExisteDesdeAsync(Guid regiaoId, string gatilho, DateTime desdeUtc);

    /// <summary>
    /// Envios da região nas últimas N horas. Serve o teto diário, que precisa converter
    /// cada EnviadoEm para o dia local em vez de calcular meia-noite local em UTC.
    /// </summary>
    Task<IReadOnlyList<NotificacaoEnviada>> ObterRecentesPorRegiaoAsync(Guid regiaoId, int horas);

    Task RegistrarAsync(NotificacaoEnviada registro);

    Task<int> RemoverAntigasAsync(DateTime limiteUtc);
}
