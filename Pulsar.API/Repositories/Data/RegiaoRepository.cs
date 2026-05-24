using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class RegiaoRepository : IRegiaoRepository
{
    private readonly PulsarDbContext _context;

    public RegiaoRepository(PulsarDbContext context) => _context = context;

    public async Task<Regiao?> ObterPorIdAsync(Guid id)
        => await _context.Regioes.FindAsync(id);

    public async Task<IEnumerable<Regiao>> ObterTodosAsync()
        => await _context.Regioes.ToListAsync();

    public async Task<IEnumerable<Regiao>> ObterTodasComSubprefeituraEScoreAsync()
        => await _context.Regioes
            .Include(r => r.Subprefeituras.Where(s => s.Ativa))
                .ThenInclude(s => s.Scores.OrderByDescending(sc => sc.Timestamp).Take(1))
            .Include(r => r.Subprefeituras.Where(s => s.Ativa))
                .ThenInclude(s => s.Leituras.OrderByDescending(l => l.Timestamp).Take(1))
            .ToListAsync();

    public async Task<Regiao?> ObterComDetalheAsync(Guid id)
        => await _context.Regioes
            .Include(r => r.Subprefeituras.Where(s => s.Ativa))
                .ThenInclude(s => s.Scores.OrderByDescending(sc => sc.Timestamp).Take(1))
            .Include(r => r.Subprefeituras.Where(s => s.Ativa))
                .ThenInclude(s => s.Leituras.OrderByDescending(l => l.Timestamp).Take(1))
            .FirstOrDefaultAsync(r => r.Id == id);

    public async Task AdicionarAsync(Regiao entidade)
        => await _context.Regioes.AddAsync(entidade);

    public Task AtualizarAsync(Regiao entidade)
    {
        _context.Regioes.Update(entidade);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(Regiao entidade)
    {
        _context.Regioes.Remove(entidade);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync()
        => await _context.SaveChangesAsync();
}
