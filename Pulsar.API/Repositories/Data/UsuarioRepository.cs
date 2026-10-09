using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class UsuarioRepository : IUsuarioRepository
{
    private readonly PulsarDbContext _context;

    public UsuarioRepository(PulsarDbContext context) => _context = context;

    public async Task<Usuario?> ObterPorIdAsync(Guid id)
        => await _context.Usuarios.FindAsync(id);

    public async Task<IEnumerable<Usuario>> ObterTodosAsync()
        => await _context.Usuarios.ToListAsync();

    // E-mail compara sem caixa: "Fulano@x" e "fulano@x" são a mesma pessoa. Comparar com
    // caixa deixava cadastrar a variação do e-mail de um admin e herdar o papel (auditoria 2026-10-09).
    public async Task<Usuario?> ObterPorEmailAsync(string email)
    {
        var alvo = Usuario.NormalizarEmail(email);
        return await _context.Usuarios.FirstOrDefaultAsync(u => u.Email.ToLower() == alvo);
    }

    public async Task<bool> EmailExisteAsync(string email)
    {
        var alvo = Usuario.NormalizarEmail(email);
        return await _context.Usuarios.AnyAsync(u => u.Email.ToLower() == alvo);
    }

    public async Task<Usuario?> ObterComFavoritosAsync(Guid id)
        => await _context.Usuarios
            .Include(u => u.Favoritos)
                .ThenInclude(f => f.Subprefeitura)
                    .ThenInclude(s => s.Regiao)
            .FirstOrDefaultAsync(u => u.Id == id);

    public async Task AdicionarFavoritoAsync(UsuarioSubprefeitura favorito)
        => await _context.UsuarioSubprefeituras.AddAsync(favorito);

    public async Task AdicionarAsync(Usuario entidade)
        => await _context.Usuarios.AddAsync(entidade);

    public Task AtualizarAsync(Usuario entidade)
    {
        _context.Usuarios.Update(entidade);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(Usuario entidade)
    {
        _context.Usuarios.Remove(entidade);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync()
        => await _context.SaveChangesAsync();
}
