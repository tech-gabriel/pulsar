using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Chuva;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Rota;

namespace Pulsar.Tests.Services;

public class RotaServiceTests
{
    [Fact]
    public async Task FalhaTardia_NaoSobrescreveSerieBoaJaEmCache()
    {
        var sub = new Subprefeitura { Nome = "Mooca", Latitude = -23.5, Longitude = -46.6 };
        var subs = new Mock<ISubprefeituraRepository>();
        subs.Setup(r => r.ObterAtivasComResumoAsync()).ReturnsAsync([sub]);
        var cge = new Mock<IPontoAlagamentoCgeRepository>();
        cge.Setup(r => r.ObterAtivosAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ReturnsAsync([]);

        // A chamada 1 fica presa e falha depois; a 2 acerta antes dela. A 3 deve achar o acerto em cache.
        var solta = new TaskCompletionSource();
        var chuva = new Mock<IChuvaReferenciaClient>();
        IReadOnlyList<IReadOnlyDictionary<DateTime, double>> boa = [new Dictionary<DateTime, double>()];
        chuva.SetupSequence(c => c.ObterHorariaAsync(It.IsAny<IReadOnlyList<(double, double)>>(), It.IsAny<CancellationToken>()))
            .Returns(async () => { await solta.Task; throw new HttpRequestException("fora do ar"); })
            .ReturnsAsync(boa)
            .ReturnsAsync(boa);
        var cache = new MemoryCache(new MemoryCacheOptions());
        var svc = new RotaService(subs.Object, cge.Object, chuva.Object, cache,
            Mock.Of<IGradeCelulas>(), Mock.Of<ICemadenService>(), NullLogger<RotaService>.Instance);

        var lenta = svc.AvaliarAsync([sub.Id]);
        await svc.AvaliarAsync([sub.Id]);
        solta.SetResult();
        await lenta;
        await svc.AvaliarAsync([sub.Id]);

        chuva.Verify(c => c.ObterHorariaAsync(It.IsAny<IReadOnlyList<(double, double)>>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
        // Chave interna do cache; o valor null (falha) não pode ter tomado o lugar da série.
        cache.TryGetValue("rota-chuva-horaria", out Dictionary<Guid, IReadOnlyDictionary<DateTime, double>>? emCache).Should().BeTrue();
        emCache.Should().NotBeNull();
    }

    // ---------- Entrega 3b: o caminho é lido nos trechos (hexágonos) por onde passa.

    private const double GrauPorKm = 1 / 111.0;
    // Caminho curto, de oeste para leste, dentro de um trecho só da grade falsa.
    private static readonly CaminhoRota Caminho = new(-23.55, -46.602, -23.55, -46.598);
    private static readonly CelulaGrade Trecho = new("c1", -23.55, -46.6, "Mooca", CalibracaoScore.Atual.Fator("Mooca"));

    /// <summary>Grade com os trechos dados: cada ponto cai no trecho de centro mais perto, a até 700 m.</summary>
    private sealed class GradeFalsa(params CelulaGrade[] celulas) : IGradeCelulas
    {
        public IReadOnlyList<CelulaGrade> DaArea(string nome) => [.. celulas.Where(c => c.Sub == nome)];
        public CelulaGrade? MaisProxima(double lat, double lon) => celulas
            .Select(c => (c, m: Pulsar.API.Services.GeoDistancia.HaversineMetros(lat, lon, c.Lat, c.Lon)))
            .Where(x => x.m <= 700).OrderBy(x => x.m).Select(x => x.c).FirstOrDefault();
    }

    private static Subprefeitura Mooca(FaixaRisco alagamentoDaArea, double chuva48h = 0)
    {
        var sub = new Subprefeitura { Nome = "Mooca", Latitude = -23.55, Longitude = -46.6 };
        sub.Scores.Add(new ScorePerigo
        {
            SubprefeituraId = sub.Id, Timestamp = DateTime.UtcNow, Chuva48hMm = chuva48h,
            FaixaAlagamento = alagamentoDaArea, Faixa = alagamentoDaArea,
        });
        return sub;
    }

    private static EstacaoChuva Estacao(double km, double mm1h, double mm3h, double? mm48h = null, double lon = -46.6)
        => new("E", -23.55 + km * GrauPorKm, lon, mm1h, mm3h, mm48h);

    private static async Task<RotaAvaliacaoDto> Avaliar(Subprefeitura sub, CaminhoRota? caminho, IGradeCelulas grade,
        Mock<ICemadenService> cemaden)
    {
        var subs = new Mock<ISubprefeituraRepository>();
        subs.Setup(r => r.ObterAtivasComResumoAsync()).ReturnsAsync([sub]);
        var cge = new Mock<IPontoAlagamentoCgeRepository>();
        cge.Setup(r => r.ObterAtivosAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ReturnsAsync([]);
        var svc = new RotaService(subs.Object, cge.Object, Mock.Of<IChuvaReferenciaClient>(),
            new MemoryCache(new MemoryCacheOptions()), grade, cemaden.Object, NullLogger<RotaService>.Instance);
        return await svc.AvaliarAsync([sub.Id], caminho);
    }

    private static Mock<ICemadenService> Cemaden(params EstacaoChuva[] estacoes)
    {
        var m = new Mock<ICemadenService>();
        m.Setup(c => c.ObterEstacoesComChuvaAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ReturnsAsync(estacoes);
        return m;
    }

    // A área está em alerta pelo modelo, mas a estação ao lado do caminho não mediu chuva.
    [Fact]
    public async Task ComCaminho_EstacaoSecaNoTrecho_AreaEmAlertaNaoMandaEsperar()
    {
        var r = await Avaliar(Mooca(FaixaRisco.ALTO), Caminho, new GradeFalsa(Trecho), Cemaden(Estacao(1.2, 0, 0, 0)));

        r.Trechos.Single().Faixa.Should().Be(FaixaRisco.BAIXO);
        r.Estado.Should().NotBe(EstadoRota.Esperar);
    }

    // O contrário: o modelo não viu a chuva, a estação do trecho mediu.
    [Fact]
    public async Task ComCaminho_EstacaoComChuvaForteNoTrecho_AreaTranquilaMandaEsperar()
    {
        var r = await Avaliar(Mooca(FaixaRisco.BAIXO), Caminho, new GradeFalsa(Trecho), Cemaden(Estacao(1.2, 30, 42.4, 60)));

        r.Trechos.Single().Faixa.Should().Be(FaixaRisco.ALTO);
        r.Estado.Should().Be(EstadoRota.Esperar);
    }

    [Fact]
    public async Task ComCaminho_SemEstacaoPerto_ValeAArea()
    {
        var longe = Estacao(RiscoTrecho.RaioEstacaoKm + 1, 0, 0, 0);

        var r = await Avaliar(Mooca(FaixaRisco.ALTO), Caminho, new GradeFalsa(Trecho), Cemaden(longe));

        r.Trechos.Single().Faixa.Should().Be(FaixaRisco.ALTO);
    }

    // Parte do caminho sem medição não pode ser dada como tranquila: ali vale o que a área diz.
    [Fact]
    public async Task ComCaminho_UmTrechoMedidoSecoEOutroSemEstacao_ValeAArea()
    {
        // Caminho longo para o leste; a estação seca só alcança o primeiro trecho.
        var caminho = new CaminhoRota(-23.55, -46.60, -23.55, -46.50);
        var perto = new CelulaGrade("c1", -23.55, -46.60, "Mooca", 1);
        var distante = new CelulaGrade("c2", -23.55, -46.50, "Mooca", 1);
        var seca = Estacao(0.5, 0, 0, 0, lon: -46.60);

        var r = await Avaliar(Mooca(FaixaRisco.ALTO), caminho, new GradeFalsa(perto, distante), Cemaden(seca));

        r.Trechos.Single().Faixa.Should().Be(FaixaRisco.ALTO);
    }

    // O caminho passa por um trecho com chuva forte medida que fica no MEIO da reta, não nas pontas.
    [Fact]
    public async Task ComCaminho_ChuvaForteSoNoMeioDoCaminho_MandaEsperar()
    {
        var caminho = new CaminhoRota(-23.55, -46.70, -23.55, -46.50);
        var meio = new CelulaGrade("meio", -23.55, -46.60, "Mooca", CalibracaoScore.Atual.Fator("Mooca"));
        var chuva = Estacao(0.5, 30, 42.4, 60, lon: -46.60);

        var r = await Avaliar(Mooca(FaixaRisco.BAIXO), caminho, new GradeFalsa(meio), Cemaden(chuva));

        r.Estado.Should().Be(EstadoRota.Esperar);
    }

    [Fact]
    public async Task SemCaminho_ValeAAreaENaoConsultaEstacoes()
    {
        var cemaden = new Mock<ICemadenService>(MockBehavior.Strict);

        var r = await Avaliar(Mooca(FaixaRisco.ALTO), null, new GradeFalsa(Trecho), cemaden);

        r.Trechos.Single().Faixa.Should().Be(FaixaRisco.ALTO);
    }

    // A leitura das estações é complemento: se falhar, a rota responde pela área, como antes.
    [Fact]
    public async Task ComCaminho_FalhaAoLerEstacoes_ValeAArea()
    {
        var cemaden = new Mock<ICemadenService>();
        cemaden.Setup(c => c.ObterEstacoesComChuvaAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("banco fora"));

        var r = await Avaliar(Mooca(FaixaRisco.ALTO), Caminho, new GradeFalsa(Trecho), cemaden);

        r.Trechos.Single().Faixa.Should().Be(FaixaRisco.ALTO);
    }

    [Fact]
    public void Pontos_VaoDaOrigemAoDestino_ComPassoDeAte300Metros()
    {
        var pontos = new CaminhoRota(-23.55, -46.70, -23.55, -46.60).Pontos();

        pontos[0].Should().Be((-23.55, -46.70));
        pontos[^1].Lon.Should().BeApproximately(-46.60, 1e-9);
        pontos.Zip(pontos.Skip(1)).Should().OnlyContain(p =>
            Pulsar.API.Services.GeoDistancia.HaversineMetros(p.First.Lat, p.First.Lon, p.Second.Lat, p.Second.Lon) <= 301);
    }

    // Um caminho absurdo (outro estado) não vira dezenas de milhares de consultas à grade.
    [Fact]
    public void Pontos_CaminhoMuitoLongo_TemTeto()
        => new CaminhoRota(-23.55, -46.6, -3.1, -60.0).Pontos().Count.Should().BeLessThanOrEqualTo(401);

    [Fact]
    public void Pontos_OrigemIgualAoDestino_DevolveOPonto()
        => new CaminhoRota(-23.55, -46.6, -23.55, -46.6).Pontos().Should().NotBeEmpty();
}
