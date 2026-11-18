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

    private static List<string> NomesDoBanco(string? cidade = null)
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options);
        ctx.Database.EnsureCreated();
        return ctx.Subprefeituras.Where(s => s.Ativa && (cidade == null || s.Regiao.Cidade.Nome == cidade)).Select(s => s.Nome).ToList();
    }

    // Trava do elo mais frágil: o nome da área no arquivo gerado precisa ser o nome do
    // BANCO (é por ele que o ciclo busca). Área sem célula ficaria sem risco por trecho em silêncio.
    [Fact]
    public void Grade_Real_CobreTodasAsAreasAtivasDoBanco()
    {
        var nomes = NomesDoBanco();

        nomes.Should().HaveCount(41); // 32 da capital + 9 da Baixada
        foreach (var nome in nomes)
            Grade.DaArea(nome).Should().NotBeEmpty($"{nome} precisa de células");
    }

    // Divisa Marsilac x Itanhaém/Mongaguá/São Vicente: a capital fica com a célula, para o
    // mesmo trecho nunca ter dois riscos.
    [Fact]
    public void Grade_Real_NenhumTrechoEmDuasAreas()
        => NomesDoBanco().SelectMany(Grade.DaArea).Select(c => c.H3).Should().OnlyHaveUniqueItems();

    public static TheoryData<string, double, double> SedesDaBaixada => new()
    {
        { "Santos", -23.9608, -46.3336 }, { "São Vicente", -23.9631, -46.3919 }, { "Guarujá", -23.9931, -46.2564 },
        { "Cubatão", -23.8950, -46.4254 }, { "Praia Grande", -24.0058, -46.4028 }, { "Bertioga", -23.8486, -46.1396 },
        { "Mongaguá", -24.0931, -46.6208 }, { "Itanhaém", -24.1831, -46.7889 }, { "Peruíbe", -24.3200, -46.9983 },
    };

    // A coleta usa a sede como ponto da área: ela precisa cair num trecho da própria área,
    // nunca no mar nem no município vizinho. Fator 1,0 até o SGB entrar (entrega 2).
    [Theory, MemberData(nameof(SedesDaBaixada))]
    public void Baixada_SedeCaiNumTrechoDaPropriaArea(string area, double lat, double lon)
    {
        Grade.DaArea(area).Should().NotBeEmpty().And.OnlyContain(c => c.Fator == 1.0);
        Grade.MaisProxima(lat, lon)!.Sub.Should().Be(area);
    }

    [Fact]
    public void Grade_Real_CelulasUnicasEFatorDentroDaFaixa()
    {
        var todas = NomesDoBanco("São Paulo").SelectMany(Grade.DaArea).ToList();

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

    // O trecho de um endereço é o hexágono onde ele cai: o de centro mais próximo.
    [Fact]
    public void MaisProxima_PontoPertoDoCentroDeUmaCelula_DevolveEla()
    {
        var alvo = Grade.DaArea("Mooca")[0];

        Grade.MaisProxima(alvo.Lat + 0.001, alvo.Lon - 0.001)!.H3.Should().Be(alvo.H3);
    }

    [Fact]
    public void MaisProxima_PontoForaDaCidade_Null()
        => Grade.MaisProxima(-22.9, -43.2).Should().BeNull(); // Rio de Janeiro
}
