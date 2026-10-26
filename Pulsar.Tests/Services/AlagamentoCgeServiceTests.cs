using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class AlagamentoCgeServiceTests
{
    private static PulsarDbContext NovoContexto(SqliteConnection conn)
    {
        var options = new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(conn).Options;
        var ctx = new PulsarDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    /// <summary>Os 19 nomes que o CGE usou entre 26/08 e 25/10/2026, com a subprefeitura certa.</summary>
    [Theory]
    [InlineData("Sé", "Sé")]
    [InlineData("Pinheiros", "Pinheiros")]
    [InlineData("Mooca", "Mooca")]
    [InlineData("Santo Amaro", "Santo Amaro")]
    [InlineData("Santana", "Santana-Tucuruvi")]
    [InlineData("Vila Mariana", "Vila Mariana")]
    [InlineData("Pirituba/Jaraguá", "Pirituba-Jaraguá")]
    [InlineData("Lapa", "Lapa")]
    [InlineData("Vila Maria/ Vila Guilherme", "Vila Maria-Vila Guilherme")]
    [InlineData("Penha", "Penha")]
    [InlineData("Butantã", "Butantã")]
    [InlineData("M'Boi Mirim", "M'Boi Mirim")]
    [InlineData("Itaquera", "Itaquera")]
    [InlineData("Ipiranga", "Ipiranga")]
    [InlineData("Casa Verde", "Casa Verde-Limão-Cachoeirinha")]
    [InlineData("São Miguel Paulista", "São Miguel")]
    [InlineData("Itaim Paulista", "Itaim Paulista")]
    [InlineData("Aricanduva/ Vila Formosa", "Aricanduva-Formosa-Carrão")]
    [InlineData("Cidade Ademar", "Cidade Ademar")]
    public async Task Casar_NomeDoCge_AchaASubprefeitura(string nomeCge, string esperado)
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);
        var subs = await ctx.Subprefeituras.ToListAsync();

        AlagamentoCgeService.Casar(nomeCge, subs)?.Nome.Should().Be(esperado);
        AlagamentoCgeService.Casar(nomeCge, subs).Should().NotBeNull();
    }

    [Theory]
    [InlineData("Vila")]
    [InlineData("Guarulhos")]
    [InlineData("")]
    public async Task Casar_NomeDesconhecido_NaoCasa(string nomeCge)
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        AlagamentoCgeService.Casar(nomeCge, await ctx.Subprefeituras.ToListAsync()).Should().BeNull();
    }

    [Fact]
    public async Task Atualizar_DuasVezes_AtualizaOPontoEmVezDeDuplicar()
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        using var ctx = NovoContexto(conn);

        var ativo = new PontoCgeBruto("Pinheiros", new TimeOnly(3, 36), null, "TN DIRCE CAMARGO", "UNICO", "R OLIVIA FEDER", Ativo: true, Transitavel: false);
        var encerrado = ativo with { Fim = new TimeOnly(6, 14), Ativo = false };
        var client = new Mock<ICgeAlagamentoClient>();
        client.SetupSequence(c => c.ObterDoDiaAsync(It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync([ativo, new PontoCgeBruto("Guarulhos", new TimeOnly(3, 0), null, "X", "", "", true, true)])
              .ReturnsAsync([encerrado]);
        var servico = new AlagamentoCgeService(ctx, client.Object, NullLogger<AlagamentoCgeService>.Instance);

        await servico.AtualizarAsync();
        var primeiro = await ctx.PontosAlagamentoCge.SingleAsync();
        primeiro.Ativo.Should().BeTrue();
        primeiro.FimUtc.Should().BeNull();
        // 03:36 em São Paulo (UTC-3) é 06:36 UTC.
        primeiro.InicioUtc.TimeOfDay.Should().Be(new TimeSpan(6, 36, 0));

        await servico.AtualizarAsync();
        var ponto = await ctx.PontosAlagamentoCge.SingleAsync();
        ponto.Ativo.Should().BeFalse();
        ponto.FimUtc!.Value.TimeOfDay.Should().Be(new TimeSpan(9, 14, 0));
    }
}
