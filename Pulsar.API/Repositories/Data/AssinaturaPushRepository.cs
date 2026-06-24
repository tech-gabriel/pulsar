using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class AssinaturaPushRepository : IAssinaturaPushRepository
{
    private readonly PulsarDbContext _context;

    public AssinaturaPushRepository(PulsarDbContext context) => _context = context;

    public async Task<AssinaturaPush?> ObterPorIdAsync(Guid id)
        => await _context.AssinaturasPush.FindAsync(id);

    public async Task<IEnumerable<AssinaturaPush>> ObterTodosAsync()
        => await _context.AssinaturasPush.ToListAsync();

    public async Task<AssinaturaPush?> ObterPorEndpointAsync(string endpoint)
        => await _context.AssinaturasPush.FirstOrDefaultAsync(a => a.Endpoint == endpoint);

    public async Task<IEnumerable<AssinaturaPush>> ObterPorRegiaoFavoritaAsync(Guid regiaoId)
        => await _context.AssinaturasPush
            .Where(a => _context.UsuarioRegioes
                .Any(ur => ur.RegiaoId == regiaoId && ur.UsuarioId == a.UsuarioId))
            .ToListAsync();

    public async Task AdicionarAsync(AssinaturaPush entidade)
        => await _context.AssinaturasPush.AddAsync(entidade);

    public Task AtualizarAsync(AssinaturaPush entidade)
    {
        _context.AssinaturasPush.Update(entidade);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(AssinaturaPush entidade)
    {
        _context.AssinaturasPush.Remove(entidade);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync()
        => await _context.SaveChangesAsync();
}
