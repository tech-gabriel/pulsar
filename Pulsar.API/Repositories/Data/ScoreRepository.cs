using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class ScoreRepository : IScoreRepository
{
    private readonly PulsarDbContext _context;

    public ScoreRepository(PulsarDbContext context) => _context = context;

    public async Task<ScorePerigo?> ObterPorIdAsync(Guid id)
        => await _context.ScoresPerigo.FindAsync(id);

    public async Task<IEnumerable<ScorePerigo>> ObterTodosAsync()
        => await _context.ScoresPerigo.ToListAsync();

    public async Task<ScorePerigo?> ObterUltimoAsync(Guid subprefeituraId)
        => await _context.ScoresPerigo
            .Where(s => s.SubprefeituraId == subprefeituraId)
            .OrderByDescending(s => s.Timestamp)
            .FirstOrDefaultAsync();

    public async Task<IEnumerable<ScorePerigo>> ObterHistoricoAsync(Guid subprefeituraId, int horas = 24)
    {
        var limite = DateTime.UtcNow.AddHours(-horas);
        return await _context.ScoresPerigo
            .Where(s => s.SubprefeituraId == subprefeituraId && s.Timestamp >= limite)
            .OrderBy(s => s.Timestamp)
            .ToListAsync();
    }

    public async Task AdicionarAsync(ScorePerigo entidade)
        => await _context.ScoresPerigo.AddAsync(entidade);

    public Task AtualizarAsync(ScorePerigo entidade)
    {
        _context.ScoresPerigo.Update(entidade);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(ScorePerigo entidade)
    {
        _context.ScoresPerigo.Remove(entidade);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync()
        => await _context.SaveChangesAsync();
}
