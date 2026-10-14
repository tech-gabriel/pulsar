using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Services;

namespace Pulsar.API.Repositories.Data;

/// <summary>
/// Tira do cache do <see cref="ValidadorSessao"/> as contas cujo carimbo ou status mudaram, ou que foram
/// excluídas. Remove <b>depois</b> do commit: antes dele, uma validação concorrente leria o carimbo velho do
/// banco e o devolveria ao cache por 60 s. Singleton; as contas pendentes ficam por DbContext.
/// </summary>
public sealed class InvalidaSessaoInterceptor : SaveChangesInterceptor
{
    private readonly IMemoryCache _cache;
    private readonly ConditionalWeakTable<DbContext, List<Guid>> _pendentes = new();

    public InvalidaSessaoInterceptor(IMemoryCache cache) => _cache = cache;

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Anotar(eventData.Context);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Anotar(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        Invalidar(eventData.Context);
        return result;
    }

    public override ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        Invalidar(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData)
    {
        if (eventData.Context is not null) _pendentes.Remove(eventData.Context);
    }

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        SaveChangesFailed(eventData);
        return Task.CompletedTask;
    }

    private void Anotar(DbContext? ctx)
    {
        if (ctx is null) return;
        var ids = ctx.ChangeTracker.Entries<Usuario>()
            .Where(e => e.State == EntityState.Deleted
                || (e.State == EntityState.Modified
                    && (e.Property(u => u.CarimboSeguranca).IsModified || e.Property(u => u.Ativo).IsModified)))
            .Select(e => e.Entity.Id)
            .ToList();
        if (ids.Count > 0)
            _pendentes.AddOrUpdate(ctx, ids);
    }

    private void Invalidar(DbContext? ctx)
    {
        if (ctx is null || !_pendentes.TryGetValue(ctx, out var ids)) return;
        foreach (var id in ids)
            ValidadorSessao.Invalidar(_cache, id);
        _pendentes.Remove(ctx);
    }
}
