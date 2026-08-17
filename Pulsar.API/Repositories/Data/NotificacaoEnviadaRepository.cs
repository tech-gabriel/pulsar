using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class NotificacaoEnviadaRepository : INotificacaoEnviadaRepository
{
    private readonly PulsarDbContext _context;

    public NotificacaoEnviadaRepository(PulsarDbContext context) => _context = context;

    public async Task<bool> ExisteChaveAsync(string chave)
        => await _context.NotificacoesEnviadas.AnyAsync(n => n.Chave == chave);

    public async Task<bool> ExisteDesdeAsync(Guid regiaoId, string gatilho, DateTime desdeUtc)
        => await _context.NotificacoesEnviadas.AnyAsync(n =>
            n.RegiaoId == regiaoId && n.Gatilho == gatilho && n.EnviadoEm >= desdeUtc);

    public async Task<IReadOnlyList<NotificacaoEnviada>> ObterRecentesPorRegiaoAsync(
        Guid regiaoId, int horas)
    {
        var limite = DateTime.UtcNow.AddHours(-horas);
        return await _context.NotificacoesEnviadas
            .Where(n => n.RegiaoId == regiaoId && n.EnviadoEm >= limite)
            .OrderByDescending(n => n.EnviadoEm)
            .ToListAsync();
    }

    public async Task RegistrarAsync(NotificacaoEnviada registro)
    {
        await _context.NotificacoesEnviadas.AddAsync(registro);
        await _context.SaveChangesAsync();
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
