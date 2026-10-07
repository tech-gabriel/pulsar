using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;

namespace Pulsar.API.Repositories.Data;

public class SugestaoRepository : ISugestaoRepository
{
    private readonly PulsarDbContext _context;

    public SugestaoRepository(PulsarDbContext context) => _context = context;

    public async Task<Sugestao?> ObterPorIdAsync(Guid id)
        => await _context.Sugestoes.FindAsync(id);

    public async Task<IEnumerable<Sugestao>> ObterTodosAsync()
        => await _context.Sugestoes.Where(s => s.Ativa).ToListAsync();

    public async Task<IReadOnlyList<Sugestao>> ListarAtivasAsync()
        => await _context.Sugestoes
            .Where(s => s.Ativa)
            .OrderBy(s => s.Categoria).ThenBy(s => s.FaixaRisco).ThenBy(s => s.Ordem)
            .ToListAsync();

    public async Task<IEnumerable<Sugestao>> ListarTodasAsync()
        => await _context.Sugestoes
            .OrderBy(s => s.Categoria)
            .ThenBy(s => s.FaixaRisco)
            .ThenBy(s => s.Ordem)
            .ToListAsync();

    public async Task AdicionarAsync(Sugestao entidade)
        => await _context.Sugestoes.AddAsync(entidade);

    public Task AtualizarAsync(Sugestao entidade)
    {
        _context.Sugestoes.Update(entidade);
        return Task.CompletedTask;
    }

    public Task RemoverAsync(Sugestao entidade)
    {
        _context.Sugestoes.Remove(entidade);
        return Task.CompletedTask;
    }

    public async Task SalvarAsync()
        => await _context.SaveChangesAsync();
}
