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

    public sealed record EstadoConta(string Carimbo, bool Ativo);

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
            var geracao = Geracao(_cache, usuarioId);
            estado = await LerContaAsync(usuarioId);
            if (estado is null)
                return false;
            // Se a conta foi invalidada enquanto líamos, o que lemos pode ser o carimbo velho: vale só
            // para esta requisição (que já estava em voo), nunca para o cache.
            lock (Trava)
            {
                if (Geracao(_cache, usuarioId) == geracao)
                    _cache.Set(Chave(usuarioId), estado, Validade);
            }
        }

        return estado!.Ativo && estado.Carimbo == carimbo;
    }

    private static readonly object Trava = new();
    private static string ChaveGeracao(Guid usuarioId) => $"sessao-geracao:{usuarioId}";
    private static long Geracao(IMemoryCache cache, Guid usuarioId)
        => cache.TryGetValue(ChaveGeracao(usuarioId), out long g) ? g : 0;

    /// <summary>
    /// Tira a conta do cache e avança a geração dela, para que uma leitura começada antes não grave o
    /// estado velho depois. Chamado pelo <see cref="InvalidaSessaoInterceptor"/> após o commit.
    /// </summary>
    public static void Invalidar(IMemoryCache cache, Guid usuarioId)
    {
        lock (Trava)
        {
            // A geração só precisa sobreviver às leituras em voo (segundos); 2x a validade sobra.
            cache.Set(ChaveGeracao(usuarioId), Geracao(cache, usuarioId) + 1, Validade * 2);
            cache.Remove(Chave(usuarioId));
        }
    }

    /// <summary>Lê carimbo e status da conta no banco. Virtual para os testes simularem a corrida.</summary>
    protected virtual async Task<EstadoConta?> LerContaAsync(Guid usuarioId)
    {
        using var escopo = _escopos.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
        return await db.Usuarios.AsNoTracking()
            .Where(u => u.Id == usuarioId)
            .Select(u => new EstadoConta(u.CarimboSeguranca, u.Ativo))
            .FirstOrDefaultAsync();
    }
}
