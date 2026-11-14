using System.Text;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pulsar.API.Domain.Score;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Domain;

public class GradeCelulasTests
{
    private static readonly GradeCelulas Grade = new(NullLogger<GradeCelulas>.Instance);

    private static List<string> NomesDoBanco()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options);
        ctx.Database.EnsureCreated();
        return ctx.Subprefeituras.Where(s => s.Ativa).Select(s => s.Nome).ToList();
    }

    // Trava do elo mais frágil: o nome da área no arquivo gerado precisa ser o nome do
    // BANCO (é por ele que o ciclo busca). Área sem célula ficaria sem risco por trecho em silêncio.
    [Fact]
    public void Grade_Real_CobreTodasAsAreasAtivasDoBanco()
    {
        var nomes = NomesDoBanco();

        nomes.Should().HaveCount(32);
        foreach (var nome in nomes)
            Grade.DaArea(nome).Should().NotBeEmpty($"{nome} precisa de células");
    }

    [Fact]
    public void Grade_Real_CelulasUnicasEFatorDentroDaFaixa()
    {
        var todas = NomesDoBanco().SelectMany(Grade.DaArea).ToList();

        todas.Should().HaveCount(2277);
        todas.Select(c => c.H3).Should().OnlyHaveUniqueItems();
        todas.Should().OnlyContain(c => c.Fator >= 0.85 && c.Fator <= 1.4375);
        todas.Should().OnlyContain(c => c.Lat < -23.3 && c.Lat > -24.1 && c.Lon < -46.3 && c.Lon > -46.9);
    }

    [Fact]
    public void DaArea_AreaDesconhecida_DevolveVazio()
        => Grade.DaArea("Área que não existe").Should().BeEmpty();

    // A grade ainda é só conferência: um arquivo quebrado não pode impedir o ciclo de
    // coleta de ser construído. Vira grade vazia (nenhum resumo) e um erro no log.
    [Theory]
    [InlineData(null)]
    [InlineData("isto não é json")]
    [InlineData("{\"celulas\":[{\"h3\":\"a\",\"lat\":-23.5,\"lon\":-46.6,\"fator\":1}]}")] // sem "sub"
    [InlineData("{}")]
    public void ArquivoAusenteOuInvalido_ViraGradeVaziaSemLancar(string? conteudo)
    {
        var grade = new GradeCelulas(
            () => conteudo is null ? null : new MemoryStream(Encoding.UTF8.GetBytes(conteudo)),
            NullLogger<GradeCelulas>.Instance);

        grade.DaArea("Mooca").Should().BeEmpty();
    }
}
