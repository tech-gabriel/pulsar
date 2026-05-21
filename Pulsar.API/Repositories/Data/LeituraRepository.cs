using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class LeituraRepository : ILeituraRepository
{
    private readonly PulsarDbContext _context;

    public LeituraRepository(PulsarDbContext context) => _context = context;

    public async Task<LeituraClimatica?> ObterPorIdAsync(Guid id)
        => await _context.LeiturasClimaticas.FindAsync(id);

    public async Task<IEnumerable<LeituraClimatica>> ObterTodosAsync()
        => await _context.LeiturasClimaticas.ToListAsync();

    public async Task<IEnumerable<LeituraClimatica>> ObterHistoricoAsync(Guid subprefeituraId, int horas = 24)
    {
        var limite = DateTime.UtcNow.AddHours(-horas);
        return await _context.LeiturasClimaticas
            .Where(l => l.SubprefeituraId == subprefeituraId && l.Timestamp >= limite)
            .OrderBy(l => l.Timestamp)
            .ToListAsync();
    }

    public async Task LimparHistoricoAntigoAsync(Guid subprefeituraId, int horas = 24)
    {
        var limite = DateTime.UtcNow.AddHours(-horas);
        var antigas = await _context.LeiturasClimaticas
            .Where(l => l.SubprefeituraId == subprefeituraId && l.Timestamp < limite)
            .ToListAsync();

        if (antigas.Count > 0)
            _context.LeiturasClimaticas.RemoveRange(antigas);
    }

    public async Task AdicionarAsync(LeituraClimatica entidade)
        => await _context.LeiturasClimaticas.AddAsync(entidade);

    public Task AtualizarAsync(LeituraClimatica entidade)
    {
        _context.LeiturasClimaticas.Update(entidade);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(LeituraClimatica entidade)
    {
        _context.LeiturasClimaticas.Remove(entidade);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync()
        => await _context.SaveChangesAsync();
}
