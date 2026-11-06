using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface ILocaisSalvosService
{
    Task<IReadOnlyList<LocalSalvoDto>> ListarAsync(Guid usuarioId);

    /// <exception cref="ArgumentException">Validação; a mensagem é exibível ao usuário.</exception>
    Task<SalvarLocalResponseDto> SalvarAsync(Guid usuarioId, TipoLocal tipo, SalvarLocalRequestDto req);

    /// <returns>false se não havia local desse tipo.</returns>
    Task<bool> ApagarAsync(Guid usuarioId, TipoLocal tipo);
}
