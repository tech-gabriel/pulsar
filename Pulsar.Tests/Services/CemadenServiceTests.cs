using Pulsar.API.Domain.Chuva;
using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Services;

public class CemadenServiceTests : IDisposable
{
    private const string Capital = "3550308";
    private static readonly DateTime Agora = new(2026, 11, 11, 20, 0, 0, DateTimeKind.Utc);

    /// <summary>Um grau de latitude tem cerca de 111 km.</summary>
    private const double GrauPorKm = 1 / 111.0;

    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly PulsarDbContext _ctx;

    public CemadenServiceTests()
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

    private CemadenService Servico(ICemadenClient client)
        => new(_ctx, client, new ConfigurationBuilder().Build(), NullLogger<CemadenService>.Instance);

    private static Mock<ICemadenClient> Cliente(bool configurado = true)
    {
        var client = new Mock<ICemadenClient>();
        client.SetupGet(c => c.Configurado).Returns(configurado);
        client.Setup(c => c.ObterAcumuladosAsync(Capital, It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            Acumulado("A", DateTime.UtcNow, acc1h: 1.4, acc24h: 5.6),
            Acumulado("B", DateTime.UtcNow, acc1h: null, acc24h: null),
        ]);
        client.Setup(c => c.ObterCadastroAsync(Capital, It.IsAny<CancellationToken>())).ReturnsAsync(
        [
            new CadastroCemaden("A", "Butantã", -23.589, -46.738),
            new CadastroCemaden("B", "Jaraguá", -23.48, -46.762),
        ]);
        return client;
    }

    private static AcumuladoCemaden Acumulado(string cod, DateTime dataHora, double? acc1h, double? acc24h)
        => new(cod, dataHora, acc1h, null, null, null, acc24h, null, null, null, null);

    // ---------- Coleta ----------

    [Fact]
    public async Task Coletar_SemCredencial_NaoChamaOClienteNemGrava()
    {
        var client = Cliente(configurado: false);

        await Servico(client.Object).ColetarAsync();

        client.Verify(c => c.ObterAcumuladosAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        client.Verify(c => c.ObterCadastroAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        (await _ctx.LeiturasEstacaoCemaden.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Coletar_GravaUmaLeituraPorEstacaoComJanelaNulaComoNull()
    {
        await Servico(Cliente().Object).ColetarAsync();

        var linhas = await _ctx.LeiturasEstacaoCemaden.ToListAsync();
        linhas.Should().HaveCount(2);
        linhas.Single(l => l.CodEstacao == "A").Should().BeEquivalentTo(new { Acc1h = 1.4, Acc24h = 5.6 });
        linhas.Single(l => l.CodEstacao == "B").Acc1h.Should().BeNull();
        linhas.Should().OnlyContain(l => l.ColetadoEm > DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task Coletar_MesmaRespostaDeNovo_NaoDuplica()
    {
        var quando = DateTime.UtcNow;
        var client = Cliente();
        client.Setup(c => c.ObterAcumuladosAsync(Capital, It.IsAny<CancellationToken>()))
            .ReturnsAsync([Acumulado("A", quando, 1.0, 2.0)]);

        await Servico(client.Object).ColetarAsync();
        await Servico(client.Object).ColetarAsync();

        (await _ctx.LeiturasEstacaoCemaden.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Coletar_CadastroVazio_BuscaEGravaAsEstacoes()
    {
        await Servico(Cliente().Object).ColetarAsync();

        var estacoes = await _ctx.EstacoesCemaden.ToListAsync();
        estacoes.Select(e => e.CodEstacao).Should().BeEquivalentTo("A", "B");
        estacoes.Single(e => e.CodEstacao == "A").Should().BeEquivalentTo(
            new { CodIbge = Capital, Nome = "Butantã", Latitude = -23.589, Longitude = -46.738 });
    }

    [Fact]
    public async Task Coletar_CadastroDeHoje_NaoBuscaDeNovo()
    {
        var client = Cliente();
        await Servico(client.Object).ColetarAsync();

        await Servico(client.Object).ColetarAsync();

        client.Verify(c => c.ObterCadastroAsync(Capital, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Coletar_CadastroComMaisDe24h_AtualizaSemDuplicar()
    {
        _ctx.EstacoesCemaden.Add(new EstacaoCemaden
        {
            CodEstacao = "A", CodIbge = Capital, Nome = "Nome antigo", Latitude = 0, Longitude = 0,
            ConferidoEm = DateTime.UtcNow.AddHours(-25),
        });
        await _ctx.SaveChangesAsync();

        await Servico(Cliente().Object).ColetarAsync();

        var estacoes = await _ctx.EstacoesCemaden.ToListAsync();
        estacoes.Should().HaveCount(2);
        estacoes.Single(e => e.CodEstacao == "A").Nome.Should().Be("Butantã");
    }

    [Fact]
    public async Task Coletar_ClienteLanca_NaoPropagaENaoGrava()
    {
        var client = Cliente();
        client.Setup(c => c.ObterAcumuladosAsync(Capital, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("PED do CEMADEN respondeu HTTP 503."));

        await Servico(client.Object).ColetarAsync();

        (await _ctx.LeiturasEstacaoCemaden.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Coletar_FalhaNoCadastro_AindaGravaAsLeituras()
    {
        var client = Cliente();
        client.Setup(c => c.ObterCadastroAsync(Capital, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("PED do CEMADEN respondeu HTTP 500."));

        await Servico(client.Object).ColetarAsync();

        (await _ctx.LeiturasEstacaoCemaden.CountAsync()).Should().Be(2);
        (await _ctx.EstacoesCemaden.CountAsync()).Should().Be(0);
    }

    // ---------- Estação que vale para a região ----------

    private async Task<Subprefeitura> Lapa() => await _ctx.Subprefeituras.SingleAsync(s => s.Nome == "Lapa");

    /// <summary>Estação a <paramref name="km"/> ao norte do centro da Lapa, com uma leitura.</summary>
    private async Task Semear(string cod, double km, double? acc1h, double? acc24h, int minutosAtras = 5, double? acc3h = null, double? acc48h = null)
    {
        var lapa = await Lapa();
        if (!await _ctx.EstacoesCemaden.AnyAsync(e => e.CodEstacao == cod))
            _ctx.EstacoesCemaden.Add(new EstacaoCemaden
            {
                CodEstacao = cod, CodIbge = Capital, Nome = $"Estação {cod}",
                Latitude = lapa.Latitude + km * GrauPorKm, Longitude = lapa.Longitude, ConferidoEm = Agora,
            });
        _ctx.LeiturasEstacaoCemaden.Add(new LeituraEstacaoCemaden
        {
            CodEstacao = cod, DataHora = Agora.AddMinutes(-minutosAtras), ColetadoEm = Agora.AddMinutes(-minutosAtras),
            Acc1h = acc1h, Acc24h = acc24h, Acc3h = acc3h, Acc48h = acc48h,
        });
        await _ctx.SaveChangesAsync();
    }

    private async Task<ChuvaCemadenRegiao?> DaLapa()
    {
        var mapa = await Servico(Mock.Of<ICemadenClient>()).ObterPorSubprefeituraAsync(Agora);
        return mapa.GetValueOrDefault((await Lapa()).Id);
    }

    [Fact]
    public async Task Obter_EstacaoA3Km_ValeParaARegiao()
    {
        await Semear("A", km: 3, acc1h: 2.5, acc24h: 30.0);

        (await DaLapa()).Should().BeEquivalentTo(new
        {
            Mm1h = 2.5, Estacao1h = "Estação A", DataHora1h = Agora.AddMinutes(-5),
            Mm24h = 30.0, Estacao24h = "Estação A", DataHora24h = Agora.AddMinutes(-5),
        });
    }

    [Fact]
    public async Task Obter_DuasEstacoes_UsaAMaisProxima()
    {
        await Semear("LONGE", km: 6, acc1h: 9.0, acc24h: 90.0);
        await Semear("PERTO", km: 2, acc1h: 1.0, acc24h: 10.0);

        (await DaLapa()).Should().BeEquivalentTo(new { Mm1h = 1.0, Mm24h = 10.0, Estacao1h = "Estação PERTO" });
    }

    [Fact]
    public async Task Obter_EstacaoA12Km_NaoVale()
    {
        await Semear("A", km: 12, acc1h: 2.5, acc24h: 30.0);

        (await DaLapa()).Should().BeNull();
    }

    [Theory]
    [InlineData(90, true)]
    [InlineData(91, false)]
    public async Task Obter_LeituraVelha_SoValeAte90Minutos(int minutosAtras, bool vale)
    {
        await Semear("A", km: 3, acc1h: 2.5, acc24h: 30.0, minutosAtras);

        ((await DaLapa()) is not null).Should().Be(vale);
    }

    [Fact]
    public async Task Obter_MaisProximaSemAcc1h_UsaAProximaCom1hEMantemAs24hDaPrimeira()
    {
        await Semear("PERTO", km: 2, acc1h: null, acc24h: 10.0);
        await Semear("LONGE", km: 6, acc1h: 4.0, acc24h: 90.0);

        (await DaLapa()).Should().BeEquivalentTo(new
        {
            Mm1h = 4.0, Estacao1h = "Estação LONGE", Mm24h = 10.0, Estacao24h = "Estação PERTO",
        });
    }

    [Fact]
    public async Task Obter_SoCom24h_DevolveSemAUltimaHora()
    {
        await Semear("A", km: 3, acc1h: null, acc24h: 12.0);

        var lapa = await DaLapa();

        lapa!.Mm1h.Should().BeNull();
        lapa.Estacao1h.Should().BeNull();
        lapa.Mm24h.Should().Be(12.0);
    }

    [Fact]
    public async Task Obter_Acc1hZero_EZeroENaoNull()
    {
        await Semear("A", km: 3, acc1h: 0.0, acc24h: 0.0);

        (await DaLapa())!.Mm1h.Should().Be(0.0);
    }

    [Fact]
    public async Task Obter_EstacaoSemNenhumaJanela_FicaForaDoResultado()
    {
        await Semear("A", km: 3, acc1h: null, acc24h: null);

        (await DaLapa()).Should().BeNull();
    }

    [Fact]
    public async Task Obter_SemLeitura_DicionarioVazio()
        => (await Servico(Mock.Of<ICemadenClient>()).ObterPorSubprefeituraAsync(Agora)).Should().BeEmpty();

    [Fact]
    public async Task Obter_UsaAUltimaLeituraDeCadaEstacao()
    {
        await Semear("A", km: 3, acc1h: 9.0, acc24h: 9.0, minutosAtras: 20);
        await Semear("A", km: 3, acc1h: 1.0, acc24h: 11.0, minutosAtras: 5);

        (await DaLapa()).Should().BeEquivalentTo(new { Mm1h = 1.0, Mm24h = 11.0 });
    }

    [Fact]
    public async Task Obter_LeituraSemCadastro_EIgnorada()
    {
        _ctx.LeiturasEstacaoCemaden.Add(new LeituraEstacaoCemaden
        {
            CodEstacao = "SEM-CADASTRO", DataHora = Agora.AddMinutes(-5), ColetadoEm = Agora.AddMinutes(-5), Acc1h = 3.0, Acc24h = 3.0,
        });
        await _ctx.SaveChangesAsync();

        (await Servico(Mock.Of<ICemadenClient>()).ObterPorSubprefeituraAsync(Agora)).Should().BeEmpty();
    }

    // ---------- Estações para a conta por trecho ----------

    private Task<IReadOnlyList<EstacaoChuva>> Estacoes() => Servico(Mock.Of<ICemadenClient>()).ObterEstacoesComChuvaAsync(Agora);

    [Fact]
    public async Task Estacoes_LeituraAtualComUmaETresHoras_VemComOEndereco()
    {
        await Semear("A", km: 3, acc1h: 4.0, acc24h: 30.0, acc3h: 10.0, acc48h: 40.0);
        var lapa = await Lapa();

        (await Estacoes()).Should().ContainSingle().Which.Should().Be(
            new EstacaoChuva("A", lapa.Latitude + 3 * GrauPorKm, lapa.Longitude, 4.0, 10.0, 40.0));
    }

    [Fact]
    public async Task Estacoes_SemAsTresHoras_FicaDeFora()
    {
        await Semear("A", km: 3, acc1h: 4.0, acc24h: 30.0);

        (await Estacoes()).Should().BeEmpty();
    }

    [Fact]
    public async Task Estacoes_LeituraVelha_FicaDeFora()
    {
        await Semear("A", km: 3, acc1h: 4.0, acc24h: 30.0, minutosAtras: 120, acc3h: 10.0);

        (await Estacoes()).Should().BeEmpty();
    }

    [Fact]
    public async Task Estacoes_LeituraAbsurda_FicaDeFora()
    {
        await Semear("A", km: 3, acc1h: 300.0, acc24h: 400.0, acc3h: 400.0);

        (await Estacoes()).Should().BeEmpty();
    }

    [Fact]
    public async Task Estacoes_UsaAUltimaLeituraDeCadaEstacao()
    {
        await Semear("A", km: 3, acc1h: 9.0, acc24h: 9.0, minutosAtras: 20, acc3h: 9.0);
        await Semear("A", km: 3, acc1h: 1.0, acc24h: 11.0, minutosAtras: 5, acc3h: 10.0);

        (await Estacoes()).Should().ContainSingle().Which.Mm1h.Should().Be(1.0);
    }
}
