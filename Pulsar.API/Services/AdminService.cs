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

    public async Task ExcluirUsuarioAsync(Guid adminId, Guid alvoId)
    {
        if (adminId == alvoId)
            throw new InvalidOperationException("Você não pode excluir a própria conta.");

        var usuario = await _usuarioRepository.ObterPorIdAsync(alvoId)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");

        if (usuario.Role == RoleAcesso.ADMIN)
            throw new InvalidOperationException("Não é possível excluir uma conta de administrador.");

        // Favoritos, tokens de recuperação e inscrições de push caem por FK CASCADE.
        await _usuarioRepository.RemoverAsync(usuario);
        await _usuarioRepository.SalvarAsync();
    }

    // ── Catálogo de Sugestões ──────────────────────────────────

    public async Task<IReadOnlyList<SugestaoAdminDto>> ListarSugestoesAsync()
    {
        var sugestoes = await _sugestaoRepository.ListarTodasAsync();
        return sugestoes.Select(MapearSugestaoDto).ToList();
    }

    public async Task<SugestaoAdminDto> CriarSugestaoAsync(SalvarSugestaoRequestDto request)
    {
        var (categoria, titulo, descricao, faixa, ordem) = ValidarSugestao(request);

        var sugestao = new Sugestao
        {
            Categoria = categoria,
            FaixaRisco = faixa,
            Titulo = titulo,
            Descricao = descricao,
            Ativa = request.Ativa,
            Ordem = ordem
        };

        await _sugestaoRepository.AdicionarAsync(sugestao);
        await _sugestaoRepository.SalvarAsync();

        return MapearSugestaoDto(sugestao);
    }

    public async Task<SugestaoAdminDto> AtualizarSugestaoAsync(Guid id, SalvarSugestaoRequestDto request)
    {
        var sugestao = await _sugestaoRepository.ObterPorIdAsync(id)
            ?? throw new KeyNotFoundException("Sugestão não encontrada.");

        var (categoria, titulo, descricao, faixa, ordem) = ValidarSugestao(request);

        sugestao.Categoria = categoria;
        sugestao.Ordem = ordem;
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
        await _sugestaoRepository.SalvarAsync();
    }

    /// <summary>Uma categoria por perigo do score. Tranquilo (BAIXO) não tem dica.</summary>
    private static readonly HashSet<string> CategoriasValidas = ["ALAGAMENTO", "VENTO", "CALOR"];

    /// <summary>Normaliza e valida os campos de uma sugestão. Lança ArgumentException se inválido.</summary>
    private static (string Categoria, string Titulo, string Descricao, FaixaRisco Faixa, int Ordem) ValidarSugestao(
        SalvarSugestaoRequestDto request)
    {
        var categoria = (request.Categoria ?? string.Empty).Trim().ToUpperInvariant();
        var titulo = (request.Titulo ?? string.Empty).Trim();
        var descricao = (request.Descricao ?? string.Empty).Trim();

        if (!CategoriasValidas.Contains(categoria))
            throw new ArgumentException("Categoria deve ser ALAGAMENTO, VENTO ou CALOR.");
        if (string.IsNullOrEmpty(titulo) || titulo.Length > 200)
            throw new ArgumentException("Título é obrigatório e deve ter até 200 caracteres.");
        if (string.IsNullOrEmpty(descricao) || descricao.Length > 1000)
            throw new ArgumentException("Descrição é obrigatória e deve ter até 1000 caracteres.");
        if (request.FaixaRisco is not (FaixaRisco.MODERADO or FaixaRisco.ALTO))
            throw new ArgumentException("Faixa deve ser MODERADO (Atenção) ou ALTO (Alerta).");
        if (request.Ordem is < 1 or > 99)
            throw new ArgumentException("Ordem deve ficar entre 1 e 99.");

        return (categoria, titulo, descricao, request.FaixaRisco, request.Ordem);
    }

    private static SugestaoAdminDto MapearSugestaoDto(Sugestao s) => new()
    {
        Id = s.Id,
        Categoria = s.Categoria,
        FaixaRisco = s.FaixaRisco,
        Titulo = s.Titulo,
        Descricao = s.Descricao,
        Ativa = s.Ativa,
        Ordem = s.Ordem,
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
