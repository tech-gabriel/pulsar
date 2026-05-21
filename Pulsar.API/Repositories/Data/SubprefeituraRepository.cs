using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class SubprefeituraRepository : ISubprefeituraRepository
{
    private readonly PulsarDbContext _context;

    public SubprefeituraRepository(PulsarDbContext context) => _context = context;

    public async Task<Subprefeitura?> ObterPorIdAsync(Guid id)
        => await _context.Subprefeituras.FindAsync(id);

    public async Task<IEnumerable<Subprefeitura>> ObterTodosAsync()
        => await _context.Subprefeituras.ToListAsync();

    public async Task<IEnumerable<Subprefeitura>> ObterAtivasAsync()
        => await _context.Subprefeituras.Where(s => s.Ativa).ToListAsync();

    public async Task<Subprefeitura?> ObterComUltimaLeituraAsync(Guid id)
        => await _context.Subprefeituras
            .Include(s => s.Leituras.OrderByDescending(l => l.Timestamp).Take(1))
            .Include(s => s.Scores.OrderByDescending(sc => sc.Timestamp).Take(1))
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task AdicionarAsync(Subprefeitura entidade)
        => await _context.Subprefeituras.AddAsync(entidade);

    public Task AtualizarAsync(Subprefeitura entidade)
    {
        _context.Subprefeituras.Update(entidade);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(Subprefeitura entidade)
    {
        _context.Subprefeituras.Remove(entidade);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync()
        => await _context.SaveChangesAsync();
}
