using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

/// <summary>
/// Operações administrativas. A autorização (ADMIN/SUPORTE) é aplicada na camada
/// de Controller via <c>[Authorize(Roles=...)]</c>; aqui ficam as regras de negócio.
/// </summary>
public interface IAdminService
{
    /// <summary>Lista todos os usuários do sistema (leitura — ADMIN e SUPORTE).</summary>
    Task<IReadOnlyList<UsuarioAdminDto>> ListarUsuariosAsync();

    /// <summary>
    /// Altera a role de um usuário. <paramref name="adminId"/> é o autor da ação,
    /// usado para impedir que o admin rebaixe a si mesmo (anti-lockout).
    /// </summary>
    Task<UsuarioAdminDto> AlterarRoleAsync(Guid adminId, Guid alvoId, RoleAcesso novaRole);

    /// <summary>
    /// Ativa/desativa um usuário. Impede que o admin desative a si mesmo.
    /// </summary>
    Task<UsuarioAdminDto> AlterarAtivoAsync(Guid adminId, Guid alvoId, bool ativo);

    // ── Catálogo de Sugestões ──────────────────────────────────

    /// <summary>Lista todas as sugestões do catálogo, incluindo inativas (ADMIN e SUPORTE).</summary>
    Task<IReadOnlyList<SugestaoAdminDto>> ListarSugestoesAsync();

    /// <summary>Cria uma nova sugestão no catálogo.</summary>
    Task<SugestaoAdminDto> CriarSugestaoAsync(SalvarSugestaoRequestDto request);

    /// <summary>Atualiza uma sugestão existente.</summary>
    Task<SugestaoAdminDto> AtualizarSugestaoAsync(Guid id, SalvarSugestaoRequestDto request);

    /// <summary>
    /// Remove uma sugestão. Lança <see cref="InvalidOperationException"/> se ela estiver
    /// vinculada a alertas (FK Restrict) — nesse caso oriente desativar em vez de excluir.
    /// </summary>
    Task RemoverSugestaoAsync(Guid id);
}
