using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class AlertaRepository : IAlertaRepository
{
    private readonly PulsarDbContext _context;

    public AlertaRepository(PulsarDbContext context) => _context = context;

    public async Task<Alerta?> ObterPorIdAsync(Guid id)
        => await _context.Alertas.FindAsync(id);

    public async Task<IEnumerable<Alerta>> ObterTodosAsync()
        => await _context.Alertas.ToListAsync();

    public async Task<IEnumerable<Alerta>> ObterRecentesPorRegiaoAsync(Guid regiaoId, int horas = 24)
    {
        var limite = DateTime.UtcNow.AddHours(-horas);
        return await _context.Alertas
            .Where(a => a.RegiaoId == regiaoId && a.Timestamp >= limite)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();
    }

    public async Task<Alerta?> ObterComSugestoesAsync(Guid alertaId)
        => await _context.Alertas
            .Include(a => a.AlertaSugestoes)
                .ThenInclude(als => als.Sugestao)
            .FirstOrDefaultAsync(a => a.Id == alertaId);

    public async Task AdicionarAsync(Alerta entidade)
        => await _context.Alertas.AddAsync(entidade);

    public Task AtualizarAsync(Alerta entidade)
    {
        _context.Alertas.Update(entidade);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(Alerta entidade)
    {
        _context.Alertas.Remove(entidade);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync()
        => await _context.SaveChangesAsync();
}
