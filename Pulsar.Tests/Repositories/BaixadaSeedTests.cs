using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

/// <summary>A Baixada entra cadastrada e escondida: coletada como a capital, invisível para o usuário.</summary>
public class BaixadaSeedTests : IDisposable
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly PulsarDbContext _db;

    public BaixadaSeedTests()
    {
        _conn.Open();
        _db = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }

    [Fact]
    public void Baixada_ExistePublicaComNoveAreasAtivas()
    {
        var baixada = _db.Cidades.Include(c => c.Regioes).ThenInclude(r => r.Subprefeituras).Single(c => c.Nome == "Baixada Santista");
        baixada.Publica.Should().BeTrue();
        baixada.CodigoIbge.Should().BeNull();
        var regiao = baixada.Regioes.Should().ContainSingle().Subject;
        regiao.FusoHorario.Should().Be("America/Sao_Paulo");
        regiao.Subprefeituras.Should().HaveCount(9).And.OnlyContain(a => a.Ativa && a.CodigoIbge != null && a.CodigoIbge.Length == 7);
        regiao.Subprefeituras.Select(a => a.Nome).Should().BeEquivalentTo(
            "Santos", "São Vicente", "Guarujá", "Cubatão", "Praia Grande", "Bertioga", "Mongaguá", "Itanhaém", "Peruíbe");
    }

    [Fact]
    public void SaoPaulo_ContinuaPublicaESemCodigoNasAreas()
    {
        var sp = _db.Cidades.Include(c => c.Regioes).ThenInclude(r => r.Subprefeituras).Single(c => c.CodigoIbge == "3550308");
        sp.Publica.Should().BeTrue();
        sp.Regioes.SelectMany(r => r.Subprefeituras).Should().HaveCount(32).And.OnlyContain(a => a.CodigoIbge == null);
    }
}
