using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Confere o carimbo do JWT contra a conta a cada requisição autenticada (SEC2). O estado da conta fica
/// 60 s em memória para não somar uma consulta ao banco por clique; o <see cref="InvalidaSessaoInterceptor"/>
/// tira a conta do cache assim que carimbo ou status mudam.
/// ponytail: cache por processo. Com mais de uma instância da API, a revogação leva até 60 s nas outras;
/// aí trocar por cache distribuído ou um canal de invalidação.
/// </summary>
public class ValidadorSessao : IValidadorSessao
{
    public static readonly TimeSpan Validade = TimeSpan.FromSeconds(60);
    public static string Chave(Guid usuarioId) => $"sessao:{usuarioId}";

    private sealed record EstadoConta(string Carimbo, bool Ativo);

    private readonly IMemoryCache _cache;
    private readonly IServiceScopeFactory _escopos;

    public ValidadorSessao(IMemoryCache cache, IServiceScopeFactory escopos)
    {
        _cache = cache;
        _escopos = escopos;
    }

    public async Task<bool> SessaoValidaAsync(Guid usuarioId, string? carimbo)
    {
        if (string.IsNullOrEmpty(carimbo))
            return false;

        if (!_cache.TryGetValue(Chave(usuarioId), out EstadoConta? estado))
        {
            using var escopo = _escopos.CreateScope();
            var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
            estado = await db.Usuarios.AsNoTracking()
                .Where(u => u.Id == usuarioId)
                .Select(u => new EstadoConta(u.CarimboSeguranca, u.Ativo))
                .FirstOrDefaultAsync();
            if (estado is null)
                return false;
            _cache.Set(Chave(usuarioId), estado, Validade);
        }

        return estado!.Ativo && estado.Carimbo == carimbo;
    }
}
