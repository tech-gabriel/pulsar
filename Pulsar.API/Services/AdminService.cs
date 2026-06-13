using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class AdminService : IAdminService
{
    private readonly IUsuarioRepository _usuarioRepository;

    public AdminService(IUsuarioRepository usuarioRepository)
        => _usuarioRepository = usuarioRepository;

    public async Task<IReadOnlyList<UsuarioAdminDto>> ListarUsuariosAsync()
    {
        var usuarios = await _usuarioRepository.ObterTodosAsync();
        return usuarios
            .OrderByDescending(u => u.CriadoEm)
            .Select(MapearAdminDto)
            .ToList();
    }

    public async Task<UsuarioAdminDto> AlterarRoleAsync(Guid adminId, Guid alvoId, RoleAcesso novaRole)
    {
        if (adminId == alvoId)
            throw new InvalidOperationException("Você não pode alterar a própria role.");

        var usuario = await _usuarioRepository.ObterPorIdAsync(alvoId)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");

        usuario.Role = novaRole;
        await _usuarioRepository.AtualizarAsync(usuario);
        await _usuarioRepository.SalvarAsync();

        return MapearAdminDto(usuario);
    }

    public async Task<UsuarioAdminDto> AlterarAtivoAsync(Guid adminId, Guid alvoId, bool ativo)
    {
        if (adminId == alvoId)
            throw new InvalidOperationException("Você não pode desativar a própria conta.");

        var usuario = await _usuarioRepository.ObterPorIdAsync(alvoId)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");

        usuario.Ativo = ativo;
        await _usuarioRepository.AtualizarAsync(usuario);
        await _usuarioRepository.SalvarAsync();

        return MapearAdminDto(usuario);
    }

    private static UsuarioAdminDto MapearAdminDto(Usuario u) => new()
    {
        Id = u.Id,
        Nome = u.Nome,
        Email = u.Email,
        Perfil = u.Perfil,
        Role = u.Role,
        Ativo = u.Ativo,
        CriadoEm = u.CriadoEm
    };
}
