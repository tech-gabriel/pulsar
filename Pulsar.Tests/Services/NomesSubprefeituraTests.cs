using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Notificacoes;

namespace Pulsar.Tests.Services;

public class NomesSubprefeituraTests
{
    [Theory]
    [InlineData("Mooca", "na Mooca")]
    [InlineData("Ipiranga", "no Ipiranga")]
    [InlineData("M'Boi Mirim", "no M'Boi Mirim")]
    [InlineData("Itaquera", "em Itaquera")]
    public void ComPreposicao_UsaATabelaECaiEmEm(string nome, string esperado)
        => NomesSubprefeitura.ComPreposicao(nome).Should().Be(esperado);

    [Fact]
    public void TodoNomeDaTabela_ExisteNoSeed()
    {
        // Pega erro de digitação: um nome da tabela que não casa com o seed cai no "em"
        // sem ninguém perceber ("em Mooca" num push real).
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options);
        ctx.Database.EnsureCreated();
        var seed = ctx.Subprefeituras.Select(s => s.Nome).ToList();

        NomesSubprefeitura.NomesComPreposicao.Should().OnlyContain(n => seed.Contains(n));
    }
}
