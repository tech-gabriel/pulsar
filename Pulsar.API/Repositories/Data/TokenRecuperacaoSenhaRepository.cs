using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class TokenRecuperacaoSenhaRepository : ITokenRecuperacaoSenhaRepository
{
    private readonly PulsarDbContext _context;

    public TokenRecuperacaoSenhaRepository(PulsarDbContext context) => _context = context;

    public async Task AdicionarAsync(TokenRecuperacaoSenha token)
        => await _context.TokensRecuperacaoSenha.AddAsync(token);

    public async Task<TokenRecuperacaoSenha?> ObterPorTokenHashAsync(string tokenHash)
        => await _context.TokensRecuperacaoSenha
            .Include(t => t.Usuario)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

    public async Task InvalidarPendentesDoUsuarioAsync(Guid usuarioId)
    {
        var agora = DateTime.UtcNow;
        var pendentes = await _context.TokensRecuperacaoSenha
            .Where(t => t.UsuarioId == usuarioId && t.UsadoEm == null && t.ExpiraEm > agora)
            .ToListAsync();

        foreach (var token in pendentes)
            token.UsadoEm = agora;
    }

    public async Task SalvarAsync()
        => await _context.SaveChangesAsync();
}
