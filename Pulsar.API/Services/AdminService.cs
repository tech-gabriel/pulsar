using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class AdminService : IAdminService
{
    private readonly IUsuarioRepository _usuarioRepository;
    private readonly ISugestaoRepository _sugestaoRepository;

    public AdminService(IUsuarioRepository usuarioRepository, ISugestaoRepository sugestaoRepository)
    {
        _usuarioRepository = usuarioRepository;
        _sugestaoRepository = sugestaoRepository;
    }

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

    // ── Catálogo de Sugestões ──────────────────────────────────

    public async Task<IReadOnlyList<SugestaoAdminDto>> ListarSugestoesAsync()
    {
        var sugestoes = await _sugestaoRepository.ListarTodasAsync();
        return sugestoes.Select(MapearSugestaoDto).ToList();
    }

    public async Task<SugestaoAdminDto> CriarSugestaoAsync(SalvarSugestaoRequestDto request)
    {
        var (categoria, titulo, descricao, faixa) = ValidarSugestao(request);

        var sugestao = new Sugestao
        {
            Categoria = categoria,
            FaixaRisco = faixa,
            Titulo = titulo,
            Descricao = descricao,
            Ativa = request.Ativa
        };

        await _sugestaoRepository.AdicionarAsync(sugestao);
        await _sugestaoRepository.SalvarAsync();

        return MapearSugestaoDto(sugestao);
    }

    public async Task<SugestaoAdminDto> AtualizarSugestaoAsync(Guid id, SalvarSugestaoRequestDto request)
    {
        var sugestao = await _sugestaoRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Sugestão não encontrada.");

        var (categoria, titulo, descricao, faixa) = ValidarSugestao(request);

        sugestao.Categoria = categoria;
        sugestao.FaixaRisco = faixa;
        sugestao.Titulo = titulo;
        sugestao.Descricao = descricao;
        sugestao.Ativa = request.Ativa;

        await _sugestaoRepository.AtualizarAsync(sugestao);
        await _sugestaoRepository.SalvarAsync();

        return MapearSugestaoDto(sugestao);
    }

    public async Task RemoverSugestaoAsync(Guid id)
    {
        var sugestao = await _sugestaoRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Sugestão não encontrada.");

        await _sugestaoRepository.RemoverAsync(sugestao);
        try
        {
            await _sugestaoRepository.SalvarAsync();
        }
        catch (DbUpdateException)
        {
            // FK AlertaSugestao -> Sugestao é Restrict: a sugestão está vinculada a alertas.
            throw new InvalidOperationException(
                "Esta sugestão está vinculada a alertas e não pode ser excluída. Desative-a em vez de excluir.");
        }
    }

    /// <summary>Normaliza e valida os campos de uma sugestão. Lança ArgumentException se inválido.</summary>
    private static (string Categoria, string Titulo, string Descricao, FaixaRisco Faixa) ValidarSugestao(
        SalvarSugestaoRequestDto request)
    {
        var categoria = (request.Categoria ?? string.Empty).Trim().ToUpperInvariant();
        var titulo = (request.Titulo ?? string.Empty).Trim();
        var descricao = (request.Descricao ?? string.Empty).Trim();

        if (string.IsNullOrEmpty(categoria) || categoria.Length > 50)
            throw new ArgumentException("Categoria é obrigatória e deve ter até 50 caracteres.");
        if (string.IsNullOrEmpty(titulo) || titulo.Length > 200)
            throw new ArgumentException("Título é obrigatório e deve ter até 200 caracteres.");
        if (string.IsNullOrEmpty(descricao) || descricao.Length > 1000)
            throw new ArgumentException("Descrição é obrigatória e deve ter até 1000 caracteres.");
        if (!Enum.IsDefined(request.FaixaRisco))
            throw new ArgumentException("Faixa de risco inválida.");

        return (categoria, titulo, descricao, request.FaixaRisco);
    }

    private static SugestaoAdminDto MapearSugestaoDto(Sugestao s) => new()
    {
        Id = s.Id,
        Categoria = s.Categoria,
        FaixaRisco = s.FaixaRisco,
        Titulo = s.Titulo,
        Descricao = s.Descricao,
        Ativa = s.Ativa,
        CriadoEm = s.CriadoEm,
        AtualizadoEm = s.AtualizadoEm
    };

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
