using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class AgregadoDiarioRepository : IAgregadoDiarioRepository
{
    private readonly PulsarDbContext _context;

    public AgregadoDiarioRepository(PulsarDbContext context) => _context = context;

    public async Task<AgregadoDiario?> ObterPorDiaAsync(Guid subprefeituraId, DateOnly dia)
        => await _context.AgregadosDiarios
            .FirstOrDefaultAsync(a => a.SubprefeituraId == subprefeituraId && a.Dia == dia);

    public async Task UpsertAsync(AgregadoDiario agregado)
    {
        var existente = await ObterPorDiaAsync(agregado.SubprefeituraId, agregado.Dia);

        if (existente is null)
        {
            await _context.AgregadosDiarios.AddAsync(agregado);
        }
        else
        {
            // Sobrescreve por completo: o serviço recalcula o dia inteiro a cada ciclo,
            // então o valor novo é sempre o mais completo. Somar aqui duplicaria.
            existente.FusoHorario = agregado.FusoHorario;
            existente.ChuvaTotalMm = agregado.ChuvaTotalMm;
            existente.ScoreMin = agregado.ScoreMin;
            existente.ScoreMedio = agregado.ScoreMedio;
            existente.ScoreMax = agregado.ScoreMax;
            existente.LeiturasBaixo = agregado.LeiturasBaixo;
            existente.LeiturasModerado = agregado.LeiturasModerado;
            existente.LeiturasAlto = agregado.LeiturasAlto;
            existente.VentoMaxKmH = agregado.VentoMaxKmH;
            existente.TemperaturaMinC = agregado.TemperaturaMinC;
            existente.TemperaturaMaxC = agregado.TemperaturaMaxC;
            existente.UvMax = agregado.UvMax;
            existente.LeiturasCount = agregado.LeiturasCount;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<AgregadoDiario>> ObterRecentesAsync(int dias)
    {
        var limite = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-dias);
        return await _context.AgregadosDiarios
            .Include(a => a.Subprefeitura).ThenInclude(s => s.Regiao)
            .Where(a => a.Dia >= limite)
            .OrderByDescending(a => a.Dia).ThenBy(a => a.Subprefeitura.Nome)
            .ToListAsync();
    }
}
