using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Score;

namespace Pulsar.Tests.Domain;

/// <summary>Cada cidade com os próprios limiares; a capital nunca muda por causa da Baixada.</summary>
public class CalibracaoScoreTests
{
    [Fact]
    public void Para_AreaDaBaixada_UsaOsParametrosDaBaixada()
        => CalibracaoScore.Para("Santos").Should().BeSameAs(CalibracaoScore.Baixada);

    // Nome desconhecido cai na capital e nunca lança: o ciclo de coleta inteiro pararia.
    [Theory]
    [InlineData("Mooca")]
    [InlineData("Área que não existe")]
    [InlineData("")]
    public void Para_ForaDaBaixada_UsaOsDaCapital(string nome)
        => CalibracaoScore.Para(nome).Should().BeSameAs(CalibracaoScore.Atual);

    // Os nomes vêm do seed do banco, e não de uma lista copiada: renomear uma área no seed sem
    // mexer na calibração faria a área cair nos limiares da capital em silêncio.
    [Fact]
    public void Baixada_TemNosFatoresExatamenteAsAreasDoSeed()
    {
        using var conn = new Microsoft.Data.Sqlite.SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var db = new Pulsar.API.Repositories.Data.PulsarDbContext(
            new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<Pulsar.API.Repositories.Data.PulsarDbContext>().UseSqlite(conn).Options);
        db.Database.EnsureCreated();
        var doSeed = db.Subprefeituras.Where(s => s.Regiao.Cidade.Nome == "Baixada Santista").Select(s => s.Nome).ToList();

        doSeed.Should().HaveCount(9);
        CalibracaoScore.Baixada.Fatores.Keys.Should().BeEquivalentTo(doSeed);
    }

    [Fact]
    public void Capital_ScoreIgualAoDeAntes()
    {
        var e = new EntradaScore(12, 25, 60, 30, 30, "Mooca");

        CalculadoraScore.Calcular(e).Should().BeEquivalentTo(CalculadoraScore.Calcular(e, CalibracaoScore.Atual));
    }

    // Calibração de 18/11/2026 (k = 1,6): a mesma chuva forte dá Alerta pleno na capital e um
    // pouco menos na Baixada, que precisa de mais chuva para alertar (relatório baixada-*.md).
    [Fact]
    public void Santos_UsaOsLimiaresDaBaixada()
    {
        var santos = CalculadoraScore.Calcular(new EntradaScore(15, 40, 40, 5, 22, "Santos")).Alagamento;
        var itaquera = CalculadoraScore.Calcular(new EntradaScore(15, 40, 40, 5, 22, "Itaquera")).Alagamento; // fator 1,0 na capital

        santos.Valor.Should().BeApproximately(87.3, 0.1);
        itaquera.Valor.Should().Be(100);
    }
}
