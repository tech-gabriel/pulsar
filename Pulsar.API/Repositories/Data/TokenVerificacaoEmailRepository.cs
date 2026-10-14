using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class TokenVerificacaoEmailRepository : ITokenVerificacaoEmailRepository
{
    private readonly PulsarDbContext _context;

    public TokenVerificacaoEmailRepository(PulsarDbContext context) => _context = context;

    public async Task AdicionarAsync(TokenVerificacaoEmail token)
        => await _context.TokensVerificacaoEmail.AddAsync(token);

    public async Task<TokenVerificacaoEmail?> ObterPorTokenHashAsync(string tokenHash)
        => await _context.TokensVerificacaoEmail
            .Include(t => t.Usuario)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

    public async Task InvalidarPendentesDoUsuarioAsync(Guid usuarioId)
    {
        var agora = DateTime.UtcNow;
        var pendentes = await _context.TokensVerificacaoEmail
            .Where(t => t.UsuarioId == usuarioId && t.UsadoEm == null && t.ExpiraEm > agora)
            .ToListAsync();
        foreach (var t in pendentes)
            t.UsadoEm = agora;
    }

    public async Task<int> ContarCriadosDesdeAsync(Guid usuarioId, DateTime desde)
        => await _context.TokensVerificacaoEmail.CountAsync(t => t.UsuarioId == usuarioId && t.CriadoEm >= desde);

    public async Task SalvarAsync() => await _context.SaveChangesAsync();
}
