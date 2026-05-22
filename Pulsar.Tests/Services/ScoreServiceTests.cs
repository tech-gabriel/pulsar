using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class ScoreServiceTests
{
    // ──────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────

    private static LeituraClimatica NovaLeitura(
        double chuva = 0, double vento = 0,
        double visib = 10, double uv = 0)
        => new()
        {
            ChuvaMmH = chuva,
            VentoKmH = vento,
            VisibilidadeKm = visib,
            IndiceUv = uv,
            Timestamp = DateTime.UtcNow
        };

    // ──────────────────────────────────────────────
    // ScorePerigo.Calcular — Normalização de Chuva
    // ──────────────────────────────────────────────

    [Fact]
    public void Calcular_ChuvaZero_RetornaPontuacaoZero()
    {
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(chuva: 0));
        resultado.Should().Be(0);
    }

    [Fact]
    public void Calcular_ChuvaMaxima50mm_RetornaPontuacao35()
    {
        // normChuva = 100; peso = 0.35 → contribuição = 35
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(chuva: 50));
        resultado.Should().BeApproximately(35.0, 0.01);
    }

    [Fact]
    public void Calcular_ChuvaAcimaMaximo100mm_ClampEm35()
    {
        // normChuva satura em 100 via Math.Clamp → mesmo resultado de 50 mm
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(chuva: 100));
        resultado.Should().BeApproximately(35.0, 0.01);
    }

    // ──────────────────────────────────────────────
    // ScorePerigo.Calcular — Normalização de Vento
    // ──────────────────────────────────────────────

    [Fact]
    public void Calcular_VentoZero_RetornaPontuacaoZero()
    {
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(vento: 0));
        resultado.Should().Be(0);
    }

    [Fact]
    public void Calcular_VentoMaximo80kmh_RetornaPontuacao30()
    {
        // normVento = 100; peso = 0.30 → contribuição = 30
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(vento: 80));
        resultado.Should().BeApproximately(30.0, 0.01);
    }

    [Fact]
    public void Calcular_VentoAcimaMaximo200kmh_ClampEm30()
    {
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(vento: 200));
        resultado.Should().BeApproximately(30.0, 0.01);
    }

    // ──────────────────────────────────────────────
    // ScorePerigo.Calcular — Normalização de Neblina
    // ──────────────────────────────────────────────

    [Fact]
    public void Calcular_NeblinaVisibilidade10km_RetornaPontuacaoZero()
    {
        // >= 10 km → normNeblina = 0
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(visib: 10));
        resultado.Should().Be(0);
    }

    [Fact]
    public void Calcular_NeblinaVisibilidadeAcima10km_RetornaPontuacaoZero()
    {
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(visib: 20));
        resultado.Should().Be(0);
    }

    [Fact]
    public void Calcular_NeblinaVisibilidade02km_RetornaPontuacao20()
    {
        // normNeblina = 100; peso = 0.20 → contribuição = 20
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(visib: 0.2));
        resultado.Should().BeApproximately(20.0, 0.01);
    }

    [Fact]
    public void Calcular_NeblinaVisibilidadeAbaixo02km_ClampEm20()
    {
        // visib = 0.1 < 0.2 → normNeblina satura em 100
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(visib: 0.1));
        resultado.Should().BeApproximately(20.0, 0.01);
    }

    [Fact]
    public void Calcular_NeblinaVisibilidade5km_NormalizaEscalaInversa()
    {
        // normNeblina = (10 - 5) / (10 - 0.2) * 100 ≈ 51.02
        // contribuição = 51.02 * 0.20 ≈ 10.204
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(visib: 5));
        resultado.Should().BeApproximately(5.0 / 9.8 * 100.0 * 0.20, 0.01);
    }

    // ──────────────────────────────────────────────
    // ScorePerigo.Calcular — Normalização de UV
    // ──────────────────────────────────────────────

    [Fact]
    public void Calcular_UvZero_RetornaPontuacaoZero()
    {
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(uv: 0));
        resultado.Should().Be(0);
    }

    [Fact]
    public void Calcular_UvMaximo11_RetornaPontuacao15()
    {
        // normUV = 100; peso = 0.15 → contribuição = 15
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(uv: 11));
        resultado.Should().BeApproximately(15.0, 0.01);
    }

    [Fact]
    public void Calcular_UvAcimaMaximo20_ClampEm15()
    {
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(uv: 20));
        resultado.Should().BeApproximately(15.0, 0.01);
    }

    // ──────────────────────────────────────────────
    // ScorePerigo.Calcular — Fórmula completa
    // ──────────────────────────────────────────────

    [Fact]
    public void Calcular_TodasVariaveisMaximas_RetornaScore100()
    {
        // 35 + 30 + 20 + 15 = 100
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(chuva: 50, vento: 80, visib: 0.2, uv: 11));
        resultado.Should().BeApproximately(100.0, 0.01);
    }

    [Fact]
    public void Calcular_ChuvaMetadeVentoMetade_PesosCorretos()
    {
        // normChuva=50, normVento=50 → 50*0.35 + 50*0.30 = 17.5+15 = 32.5
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(chuva: 25, vento: 40, visib: 10, uv: 0));
        resultado.Should().BeApproximately(32.5, 0.01);
    }

    [Fact]
    public void Calcular_ChuvaEUvMetade_RetornaContribuicaoCorreta()
    {
        // normChuva=50 → 17.5; normUV=50 → 7.5; total=25.0
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(chuva: 25, vento: 0, visib: 10, uv: 5.5));
        resultado.Should().BeApproximately(25.0, 0.01);
    }

    [Fact]
    public void Calcular_ValoresNegativos_ClampZero()
    {
        // chuva negativa → normaliza abaixo de 0 → clamp para 0
        var score = new ScorePerigo();
        var resultado = score.Calcular(NovaLeitura(chuva: -10, vento: -5, visib: 10, uv: -1));
        resultado.Should().Be(0);
    }

    // ──────────────────────────────────────────────
    // ScorePerigo.ClassificarFaixa
    // ──────────────────────────────────────────────

    [Theory]
    [InlineData(0, FaixaRisco.BAIXO)]
    [InlineData(15, FaixaRisco.BAIXO)]
    [InlineData(30, FaixaRisco.BAIXO)]    // limite superior BAIXO
    [InlineData(31, FaixaRisco.MODERADO)] // limite inferior MODERADO
    [InlineData(45, FaixaRisco.MODERADO)]
    [InlineData(60, FaixaRisco.MODERADO)] // limite superior MODERADO
    [InlineData(61, FaixaRisco.ALTO)]     // limite inferior ALTO
    [InlineData(85, FaixaRisco.ALTO)]
    [InlineData(100, FaixaRisco.ALTO)]
    public void ClassificarFaixa_Boundaries_RetornaFaixaCorreta(double valor, FaixaRisco esperada)
    {
        var score = new ScorePerigo { Valor = valor };
        score.ClassificarFaixa().Should().Be(esperada);
    }

    // ──────────────────────────────────────────────
    // LeituraClimatica.IsValida
    // ──────────────────────────────────────────────

    [Fact]
    public void IsValida_ValoresCorretos_RetornaTrue()
    {
        var leitura = NovaLeitura(chuva: 5, vento: 10, visib: 3, uv: 2);
        leitura.IsValida().Should().BeTrue();
    }

    [Fact]
    public void IsValida_ChuvaNegativa_RetornaFalse()
    {
        var leitura = NovaLeitura(chuva: -1, vento: 10, visib: 5, uv: 2);
        leitura.IsValida().Should().BeFalse();
    }

    [Fact]
    public void IsValida_VentoNegativo_RetornaFalse()
    {
        var leitura = NovaLeitura(chuva: 0, vento: -5, visib: 5, uv: 2);
        leitura.IsValida().Should().BeFalse();
    }

    [Fact]
    public void IsValida_VisibilidadeZero_RetornaFalse()
    {
        var leitura = NovaLeitura(chuva: 0, vento: 0, visib: 0, uv: 2);
        leitura.IsValida().Should().BeFalse();
    }

    [Fact]
    public void IsValida_UvNegativo_RetornaFalse()
    {
        var leitura = NovaLeitura(chuva: 0, vento: 0, visib: 5, uv: -0.1);
        leitura.IsValida().Should().BeFalse();
    }

    [Fact]
    public void IsValida_ChuvaZeroVentoZero_RetornaTrue()
    {
        // zero é válido para chuva e vento, apenas visibilidade precisa ser > 0
        var leitura = NovaLeitura(chuva: 0, vento: 0, visib: 0.1, uv: 0);
        leitura.IsValida().Should().BeTrue();
    }

    // ──────────────────────────────────────────────
    // ScoreService.CalcularEPersistirAsync (com mocks)
    // ──────────────────────────────────────────────

    private readonly Mock<ISubprefeituraRepository> _subprefeituraRepoMock = new();
    private readonly Mock<ILeituraRepository> _leituraRepoMock = new();
    private readonly Mock<IScoreRepository> _scoreRepoMock = new();

    private ScoreService CriarScoreService() => new(
        _subprefeituraRepoMock.Object,
        _leituraRepoMock.Object,
        _scoreRepoMock.Object,
        NullLogger<ScoreService>.Instance);

    [Fact]
    public async Task CalcularEPersistirAsync_SubprefeituraInexistente_LancaException()
    {
        _subprefeituraRepoMock
            .Setup(r => r.ObterComUltimaLeituraAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Subprefeitura?)null);

        var sut = CriarScoreService();

        await sut.Invoking(s => s.CalcularEPersistirAsync(Guid.NewGuid()))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*não encontrada*");
    }

    [Fact]
    public async Task CalcularEPersistirAsync_SemLeituraDisponivel_LancaException()
    {
        var sub = new Subprefeitura { Nome = "Sé" }; // Leituras vazia

        _subprefeituraRepoMock
            .Setup(r => r.ObterComUltimaLeituraAsync(sub.Id))
            .ReturnsAsync(sub);

        var sut = CriarScoreService();

        await sut.Invoking(s => s.CalcularEPersistirAsync(sub.Id))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Nenhuma leitura*");
    }

    [Fact]
    public async Task CalcularEPersistirAsync_ComLeitura_PersistirScoreERetornaValor()
    {
        var leitura = NovaLeitura(chuva: 25, vento: 40, visib: 5, uv: 5.5);
        var sub = new Subprefeitura { Nome = "Sé" };
        sub.Leituras.Add(leitura);

        _subprefeituraRepoMock
            .Setup(r => r.ObterComUltimaLeituraAsync(sub.Id))
            .ReturnsAsync(sub);
        _scoreRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<ScorePerigo>())).Returns(Task.CompletedTask);
        _scoreRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarScoreService();
        var resultado = await sut.CalcularEPersistirAsync(sub.Id);

        resultado.Should().NotBeNull();
        resultado.Valor.Should().BeGreaterThan(0);
        resultado.Valor.Should().BeLessThanOrEqualTo(100);

        _scoreRepoMock.Verify(r => r.AdicionarAsync(It.IsAny<ScorePerigo>()), Times.Once);
        _scoreRepoMock.Verify(r => r.SalvarAsync(), Times.Once);
    }

    [Fact]
    public async Task CalcularEPersistirAsync_TodasMaximas_FaixaAltoEScore100()
    {
        var leitura = NovaLeitura(chuva: 50, vento: 80, visib: 0.2, uv: 11);
        var sub = new Subprefeitura { Nome = "Sé" };
        sub.Leituras.Add(leitura);

        _subprefeituraRepoMock
            .Setup(r => r.ObterComUltimaLeituraAsync(sub.Id))
            .ReturnsAsync(sub);
        _scoreRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<ScorePerigo>())).Returns(Task.CompletedTask);
        _scoreRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarScoreService();
        var resultado = await sut.CalcularEPersistirAsync(sub.Id);

        resultado.Valor.Should().BeApproximately(100.0, 0.01);
        resultado.Faixa.Should().Be(FaixaRisco.ALTO);
    }

    // ──────────────────────────────────────────────
    // Regiao.GetScoreAgregado — MAX das subprefeituras
    // ──────────────────────────────────────────────

    [Fact]
    public void GetScoreAgregado_SemSubprefeituras_RetornaZero()
    {
        var regiao = new Regiao { Nome = "Norte" };
        regiao.GetScoreAgregado().Should().Be(0);
    }

    [Fact]
    public void GetScoreAgregado_SubprefeiturasSemScore_RetornaZero()
    {
        var regiao = new Regiao { Nome = "Sul" };
        regiao.Subprefeituras.Add(new Subprefeitura { Ativa = true });

        regiao.GetScoreAgregado().Should().Be(0);
    }

    [Fact]
    public void GetScoreAgregado_MultiplasSubs_RetornaMax()
    {
        var regiao = new Regiao { Nome = "Leste" };

        var sub1 = new Subprefeitura { Ativa = true };
        sub1.Scores.Add(new ScorePerigo { Valor = 45, Timestamp = DateTime.UtcNow });

        var sub2 = new Subprefeitura { Ativa = true };
        sub2.Scores.Add(new ScorePerigo { Valor = 75, Timestamp = DateTime.UtcNow });

        var sub3 = new Subprefeitura { Ativa = true };
        sub3.Scores.Add(new ScorePerigo { Valor = 30, Timestamp = DateTime.UtcNow });

        regiao.Subprefeituras.Add(sub1);
        regiao.Subprefeituras.Add(sub2);
        regiao.Subprefeituras.Add(sub3);

        regiao.GetScoreAgregado().Should().Be(75);
    }

    [Fact]
    public void GetScoreAgregado_SubprefeituraInativa_NaoContabilizada()
    {
        var regiao = new Regiao { Nome = "Oeste" };

        var subAtiva = new Subprefeitura { Ativa = true };
        subAtiva.Scores.Add(new ScorePerigo { Valor = 40, Timestamp = DateTime.UtcNow });

        var subInativa = new Subprefeitura { Ativa = false };
        subInativa.Scores.Add(new ScorePerigo { Valor = 99, Timestamp = DateTime.UtcNow });

        regiao.Subprefeituras.Add(subAtiva);
        regiao.Subprefeituras.Add(subInativa);

        regiao.GetScoreAgregado().Should().Be(40);
    }
}
