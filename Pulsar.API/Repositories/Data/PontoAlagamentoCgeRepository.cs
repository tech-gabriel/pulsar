using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class PontoAlagamentoCgeRepository : IPontoAlagamentoCgeRepository
{
    private readonly PulsarDbContext _context;

    public PontoAlagamentoCgeRepository(PulsarDbContext context) => _context = context;

    public async Task<IReadOnlyList<PontoAlagamentoCge>> ObterAtivosAsync(DateTime vistoDesde, CancellationToken ct = default)
        => await _context.PontosAlagamentoCge
            .Where(p => p.Ativo && p.VistoEm >= vistoDesde)
            .OrderBy(p => p.InicioUtc)
            .ToListAsync(ct);
}
