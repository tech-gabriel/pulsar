using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>Corpo de PUT /api/admin/usuarios/{id}/role.</summary>
public class AlterarRoleRequestDto
{
    public RoleAcesso Role { get; set; }
}
