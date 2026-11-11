using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class EstacaoCgeServiceTests : IDisposable
{
    private const int Lapa = 1000848, CapelaPrincipal = 1000857, CapelaReserva = 846, Maua = 1000876;
    private static readonly DateTime Agora = new(2026, 11, 10, 18, 0, 0, DateTimeKind.Utc);

    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly PulsarDbContext _ctx;

    public EstacaoCgeServiceTests()
    {
        _conn.Open();
        _ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(_conn).Options);
        _ctx.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _ctx.Dispose();
        _conn.Dispose();
    }

    private EstacaoCgeService Servico(ICgeEstacaoClient? client = null)
        => new(_ctx, client ?? Mock.Of<ICgeEstacaoClient>(), NullLogger<EstacaoCgeService>.Instance);

    private static EstacaoCgeBruta Bruta(double chuva = 1.0)
        => new(chuva, 0.0, new TimeOnly(10, 0), 20.0, 80.0, "N", 5.0, 9.0, 930.0);

    /// <summary>Leituras do posto; a temperatura muda a cada uma para o posto não parecer parado.</summary>
    private async Task Semear(int posto, params (int MinutosAtras, double Acumulado)[] leituras)
    {
        var i = 0;
        foreach (var (min, acumulado) in leituras)
            _ctx.LeiturasEstacaoCge.Add(new LeituraEstacaoCge
            {
                Posto = posto, ColetadoEm = Agora.AddMinutes(-min), ChuvaPeriodoMm = acumulado, TemperaturaC = 20 + i++ * 0.1,
            });
        await _ctx.SaveChangesAsync();
    }

    private async Task<Guid> IdDe(string nome) => (await _ctx.Subprefeituras.SingleAsync(s => s.Nome == nome)).Id;

    [Fact]
    public async Task ColetarAsync_GravaUmaLeituraPorPosto()
    {
        var client = new Mock<ICgeEstacaoClient>();
        client.Setup(c => c.ObterAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(Bruta(3.2));

        await Servico(client.Object).ColetarAsync();

        var linhas = await _ctx.LeiturasEstacaoCge.ToListAsync();
        linhas.Should().HaveCount(32);
        linhas.Select(l => l.ColetadoEm).Distinct().Should().HaveCount(1);
        linhas.Count(l => l.SubprefeituraId is not null).Should().Be(29);
        linhas.Single(l => l.Posto == Maua).SubprefeituraId.Should().BeNull();
        linhas.Single(l => l.Posto == Lapa).SubprefeituraId.Should().Be(await IdDe("Lapa"));
        linhas[0].ChuvaPeriodoMm.Should().Be(3.2);
        linhas[0].RajadaKmH.Should().Be(9.0);
    }

    [Fact]
    public async Task ColetarAsync_PostoQueFalha_NaoImpedeOsOutros()
    {
        var client = new Mock<ICgeEstacaoClient>();
        client.Setup(c => c.ObterAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(Bruta());
        client.Setup(c => c.ObterAsync(503, It.IsAny<CancellationToken>())).ThrowsAsync(new HttpRequestException("fora"));
        client.Setup(c => c.ObterAsync(504, It.IsAny<CancellationToken>())).ReturnsAsync((EstacaoCgeBruta?)null);

        await Servico(client.Object).ColetarAsync();

        (await _ctx.LeiturasEstacaoCge.CountAsync()).Should().Be(30);
    }

    [Fact]
    public async Task ObterPorSubprefeitura_PostoProprio_NaoEVizinho()
    {
        await Semear(Lapa, (30, 2.0), (15, 5.0), (0, 9.0));

        var medida = (await Servico().ObterPorSubprefeituraAsync(Agora))[await IdDe("Lapa")];

        medida.Posto.Should().Be(Lapa);
        medida.NomePosto.Should().Be("Lapa");
        medida.Vizinho.Should().BeFalse();
        medida.Mm15.Should().Be(4.0);
        medida.Mm30.Should().Be(7.0);
        medida.Mm60.Should().BeNull();
        medida.AcumuladoPeriodoMm.Should().Be(9.0);
        medida.ColetadoEm.Should().Be(Agora);
    }

    [Fact]
    public async Task ObterPorSubprefeitura_SemPostoProprio_UsaOMaisProximoMarcadoComoVizinho()
    {
        await Semear(Lapa, (15, 5.0), (0, 9.0));

        // Casa Verde não tem posto na lista do CGE e fica ao lado da Lapa.
        var medida = (await Servico().ObterPorSubprefeituraAsync(Agora))[await IdDe("Casa Verde-Limão-Cachoeirinha")];

        medida.Posto.Should().Be(Lapa);
        medida.NomePosto.Should().Be("Lapa");
        medida.Vizinho.Should().BeTrue();
        medida.Mm15.Should().Be(4.0);
    }

    [Fact]
    public async Task ObterPorSubprefeitura_VizinhoLongeDemais_FicaSemDado()
    {
        await Semear(Lapa, (15, 5.0), (0, 9.0));

        // Parelheiros fica a mais de 25 km da Lapa: chuva de lá não diz nada sobre aqui.
        (await Servico().ObterPorSubprefeituraAsync(Agora)).Should().NotContainKey(await IdDe("Parelheiros"));
    }

    [Fact]
    public async Task ObterPorSubprefeitura_PostoProprioParado_CaiParaOSegundoDaMesmaSubprefeitura()
    {
        foreach (var min in Enumerable.Range(0, 8).Select(i => 105 - i * 15))
            _ctx.LeiturasEstacaoCge.Add(new LeituraEstacaoCge { Posto = CapelaPrincipal, ColetadoEm = Agora.AddMinutes(-min), ChuvaPeriodoMm = 3.0, TemperaturaC = 20 });
        await Semear(CapelaReserva, (15, 1.0), (0, 1.6));

        var medida = (await Servico().ObterPorSubprefeituraAsync(Agora))[await IdDe("Capela do Socorro")];

        medida.Posto.Should().Be(CapelaReserva);
        medida.Vizinho.Should().BeFalse();
        medida.Mm15.Should().Be(0.6);
    }

    [Fact]
    public async Task ObterPorSubprefeitura_SoPostoDeForaDaCapitalComDado_NinguemRecebe()
    {
        await Semear(Maua, (15, 5.0), (0, 30.0));

        (await Servico().ObterPorSubprefeituraAsync(Agora)).Should().BeEmpty();
    }

    [Fact]
    public async Task ObterPorSubprefeitura_LeiturasVelhas_NinguemRecebe()
    {
        await Semear(Lapa, (55, 5.0), (40, 9.0));

        (await Servico().ObterPorSubprefeituraAsync(Agora)).Should().BeEmpty();
    }
}
