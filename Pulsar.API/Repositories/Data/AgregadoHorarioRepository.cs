using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class AgregadoHorarioRepository : IAgregadoHorarioRepository
{
    private readonly PulsarDbContext _context;

    public AgregadoHorarioRepository(PulsarDbContext context) => _context = context;

    public async Task UpsertAsync(AgregadoHorario agregado)
    {
        var existente = await _context.AgregadosHorarios
            .FirstOrDefaultAsync(a => a.SubprefeituraId == agregado.SubprefeituraId && a.HoraUtc == agregado.HoraUtc);

        if (existente is null)
        {
            await _context.AgregadosHorarios.AddAsync(agregado);
        }
        else
        {
            // Sobrescreve, como no diário: a hora é recalculada inteira a cada ciclo.
            existente.ChuvaMm = agregado.ChuvaMm;
            existente.ChuvaBrutaMm = agregado.ChuvaBrutaMm;
            existente.ScoreAlagamentoMax = agregado.ScoreAlagamentoMax;
            existente.LeiturasCount = agregado.LeiturasCount;
        }

        await _context.SaveChangesAsync();
    }
}
