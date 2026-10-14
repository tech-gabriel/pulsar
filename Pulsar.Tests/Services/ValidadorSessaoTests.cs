using System.Data.Common;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class ValidadorSessaoTests
{
    [Fact]
    public void RenovarCarimbo_GeraValorNovo()
    {
        var u = new Usuario { Nome = "Ana", Email = "ana@x.com", SenhaHash = "h" };
        var antes = u.CarimboSeguranca;

        u.RenovarCarimbo();

        antes.Should().NotBeNullOrEmpty();
        u.CarimboSeguranca.Should().NotBe(antes).And.HaveLength(32);
    }

    /// <summary>Conta SELECTs para provar que o cache evita o banco.</summary>
    private sealed class ContadorConsultas : DbCommandInterceptor
    {
        public int Consultas;

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("SELECT", StringComparison.OrdinalIgnoreCase))
                Interlocked.Increment(ref Consultas);
            return ValueTask.FromResult(result);
        }
    }

    /// <summary>
    /// Simula a corrida: durante o "Saving" (antes do commit), uma requisição concorrente lê o carimbo velho
    /// e o recoloca no cache. Registrado DEPOIS do interceptor real, roda depois dele em cada fase.
    /// </summary>
    private sealed class RecolocaCarimboVelho(MemoryCache cache) : SaveChangesInterceptor
    {
        public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
        {
            foreach (var u in eventData.Context!.ChangeTracker.Entries<Usuario>())
                cache.Set(ValidadorSessao.Chave(u.Entity.Id), "velho-recolocado");
            return result;
        }
    }

    private sealed class Ambiente : IDisposable
    {
        public SqliteConnection Conexao { get; } = new("Data Source=:memory:");
        public MemoryCache Cache { get; } = new(new MemoryCacheOptions());
        public ContadorConsultas Contador { get; } = new();
        public ServiceProvider Servicos { get; }

        public Ambiente(bool recolocarVelho = false)
        {
            Conexao.Open();
            var sc = new ServiceCollection();
            sc.AddSingleton<IMemoryCache>(Cache);
            sc.AddSingleton<InvalidaSessaoInterceptor>();
            sc.AddDbContext<PulsarDbContext>((sp, o) =>
            {
                o.UseSqlite(Conexao).AddInterceptors(sp.GetRequiredService<InvalidaSessaoInterceptor>(), Contador);
                if (recolocarVelho) o.AddInterceptors(new RecolocaCarimboVelho(Cache));
            });
            Servicos = sc.BuildServiceProvider();
            using var escopo = Servicos.CreateScope();
            escopo.ServiceProvider.GetRequiredService<PulsarDbContext>().Database.EnsureCreated();
        }

        public ValidadorSessao Validador() => new(Cache, Servicos.GetRequiredService<IServiceScopeFactory>());

        public Usuario Salvar(Usuario u)
        {
            using var escopo = Servicos.CreateScope();
            var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
            db.Usuarios.Add(u);
            db.SaveChanges();
            return u;
        }

        public void Alterar(Guid id, Action<Usuario> mudar)
        {
            using var escopo = Servicos.CreateScope();
            var db = escopo.ServiceProvider.GetRequiredService<PulsarDbContext>();
            var u = db.Usuarios.Single(x => x.Id == id);
            mudar(u);
            db.SaveChanges();
        }

        public void Dispose()
        {
            Servicos.Dispose();
            Conexao.Dispose();
            Cache.Dispose();
        }
    }

    private static Usuario NovoUsuario() => new() { Nome = "Ana", Email = $"{Guid.NewGuid():N}@x.com", SenhaHash = "h" };

    [Fact]
    public async Task CarimboCerto_Passa_EASegundaVezNaoVaiAoBanco()
    {
        using var amb = new Ambiente();
        var u = amb.Salvar(NovoUsuario());
        var v = amb.Validador();

        (await v.SessaoValidaAsync(u.Id, u.CarimboSeguranca)).Should().BeTrue();
        var depoisDaPrimeira = amb.Contador.Consultas;
        (await v.SessaoValidaAsync(u.Id, u.CarimboSeguranca)).Should().BeTrue();

        amb.Contador.Consultas.Should().Be(depoisDaPrimeira);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("outro")]
    public async Task CarimboAusenteOuDiferente_Recusa(string? carimbo)
    {
        using var amb = new Ambiente();
        var u = amb.Salvar(NovoUsuario());

        (await amb.Validador().SessaoValidaAsync(u.Id, carimbo)).Should().BeFalse();
    }

    [Fact]
    public async Task ContaInexistente_Recusa()
    {
        using var amb = new Ambiente();
        (await amb.Validador().SessaoValidaAsync(Guid.NewGuid(), "qualquer")).Should().BeFalse();
    }

    [Fact]
    public async Task ContaDesativada_Recusa()
    {
        using var amb = new Ambiente();
        var u = NovoUsuario();
        u.Ativo = false;
        amb.Salvar(u);

        (await amb.Validador().SessaoValidaAsync(u.Id, u.CarimboSeguranca)).Should().BeFalse();
    }

    [Fact]
    public async Task RenovarESalvar_DerrubaOTokenAntigoNaHora_MesmoComCache()
    {
        using var amb = new Ambiente();
        var u = amb.Salvar(NovoUsuario());
        var antigo = u.CarimboSeguranca;
        var v = amb.Validador();
        (await v.SessaoValidaAsync(u.Id, antigo)).Should().BeTrue(); // agora está no cache

        amb.Alterar(u.Id, x => x.RenovarCarimbo());

        (await v.SessaoValidaAsync(u.Id, antigo)).Should().BeFalse();
    }

    [Fact]
    public async Task DesativarESalvar_DerrubaNaHora()
    {
        using var amb = new Ambiente();
        var u = amb.Salvar(NovoUsuario());
        var v = amb.Validador();
        (await v.SessaoValidaAsync(u.Id, u.CarimboSeguranca)).Should().BeTrue();

        amb.Alterar(u.Id, x => x.Ativo = false);

        (await v.SessaoValidaAsync(u.Id, u.CarimboSeguranca)).Should().BeFalse();
    }

    /// <summary>Lê a conta de verdade e, antes de devolver, roda <paramref name="duranteLeitura"/> (o commit concorrente).</summary>
    private sealed class ValidadorComCorrida(IMemoryCache cache, IServiceScopeFactory escopos, Action duranteLeitura)
        : ValidadorSessao(cache, escopos)
    {
        protected override async Task<EstadoConta?> LerContaAsync(Guid usuarioId)
        {
            var estado = await base.LerContaAsync(usuarioId);
            duranteLeitura();
            return estado;
        }
    }

    [Fact]
    public async Task LeituraVelhaTerminadaDepoisDaRevogacao_NaoVoltaParaOCache()
    {
        // Achado da revisão de segurança: a leitura pega o carimbo velho, a revogação commita e limpa o
        // cache, e só então a leitura grava o valor velho, que valeria por 60 s.
        using var amb = new Ambiente();
        var u = amb.Salvar(NovoUsuario());
        var antigo = u.CarimboSeguranca;
        var escopos = amb.Servicos.GetRequiredService<IServiceScopeFactory>();
        var lento = new ValidadorComCorrida(amb.Cache, escopos, () => amb.Alterar(u.Id, x => x.RenovarCarimbo()));

        await lento.SessaoValidaAsync(u.Id, antigo); // esta requisição já estava em voo; o resultado dela não importa

        (await amb.Validador().SessaoValidaAsync(u.Id, antigo)).Should().BeFalse();
    }

    [Fact]
    public void Interceptor_InvalidaDepoisDoCommit_MesmoComRecolocacaoConcorrente()
    {
        // Review Focus 1. Se o interceptor só limpasse no "Saving", o valor recolocado sobreviveria por 60 s.
        using var amb = new Ambiente(recolocarVelho: true);
        var u = amb.Salvar(NovoUsuario());

        amb.Alterar(u.Id, x => x.RenovarCarimbo());

        amb.Cache.TryGetValue(ValidadorSessao.Chave(u.Id), out _).Should().BeFalse();
    }
}
