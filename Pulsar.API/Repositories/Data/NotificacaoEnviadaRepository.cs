using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class NotificacaoEnviadaRepository : INotificacaoEnviadaRepository
{
    private readonly PulsarDbContext _context;

    public NotificacaoEnviadaRepository(PulsarDbContext context) => _context = context;

    public async Task<IReadOnlyList<NotificacaoEnviada>> ObterRecentesAsync(IReadOnlyCollection<Guid> usuarioIds, int horas)
    {
        var limite = DateTime.UtcNow.AddHours(-horas);
        return await _context.NotificacoesEnviadas
            .Where(n => usuarioIds.Contains(n.UsuarioId) && n.EnviadoEm >= limite)
            .ToListAsync();
    }

    public async Task RegistrarAsync(IReadOnlyList<NotificacaoEnviada> registros)
    {
        await _context.NotificacoesEnviadas.AddRangeAsync(registros);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Chave duplicada (ciclos sobrepostos) é desfecho esperado: é para isso que o
            // índice único existe. Soltar as entidades porque o ciclo usa um contexto só, e
            // sem isto o SaveChanges da próxima pessoa repetiria o INSERT que falhou.
            foreach (var r in registros) _context.Entry(r).State = EntityState.Detached;
            throw;
        }
    }

    public async Task<int> RemoverAntigasAsync(DateTime limiteUtc)
    {
        var antigos = await _context.NotificacoesEnviadas
            .Where(n => n.EnviadoEm < limiteUtc)
            .ToListAsync();

        if (antigos.Count == 0) return 0;

        _context.NotificacoesEnviadas.RemoveRange(antigos);
        await _context.SaveChangesAsync();
        return antigos.Count;
    }
}
