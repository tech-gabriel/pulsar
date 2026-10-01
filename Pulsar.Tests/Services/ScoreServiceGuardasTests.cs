using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

/// <summary>
/// Testes que viviam no ScoreServiceTests antigo e cobrem comportamento que continua
/// existindo após o S1 (validação de leitura, guardas do serviço, agregado da região).
/// </summary>
public class ScoreServiceGuardasTests
{
    private static LeituraClimatica NovaLeitura(double chuva = 0, double vento = 0, double visib = 10, double uv = 0)
        => new() { ChuvaMmH = chuva, VentoKmH = vento, VisibilidadeKm = visib, IndiceUv = uv, Timestamp = DateTime.UtcNow };

    // ── LeituraClimatica.IsValida ──

    [Fact]
    public void IsValida_ValoresCorretos_RetornaTrue()
        => NovaLeitura(chuva: 5, vento: 10, visib: 3, uv: 2).IsValida().Should().BeTrue();

    [Fact]
    public void IsValida_ChuvaNegativa_RetornaFalse()
        => NovaLeitura(chuva: -1, vento: 10, visib: 5, uv: 2).IsValida().Should().BeFalse();

    [Fact]
    public void IsValida_VentoNegativo_RetornaFalse()
        => NovaLeitura(chuva: 0, vento: -5, visib: 5, uv: 2).IsValida().Should().BeFalse();

    [Fact]
    public void IsValida_VisibilidadeZero_RetornaFalse()
        => NovaLeitura(chuva: 0, vento: 0, visib: 0, uv: 2).IsValida().Should().BeFalse();

    [Fact]
    public void IsValida_UvNegativo_RetornaFalse()
        => NovaLeitura(chuva: 0, vento: 0, visib: 5, uv: -0.1).IsValida().Should().BeFalse();

    [Fact]
    public void IsValida_ChuvaZeroVentoZero_RetornaTrue()
        // zero é válido para chuva e vento, apenas visibilidade precisa ser > 0
        => NovaLeitura(chuva: 0, vento: 0, visib: 0.1, uv: 0).IsValida().Should().BeTrue();

    // ── ScoreService: guardas ──

    private readonly Mock<ISubprefeituraRepository> _subprefeituraRepoMock = new();
    private readonly Mock<ILeituraRepository> _leituraRepoMock = new();
    private readonly Mock<IScoreRepository> _scoreRepoMock = new();

    private ScoreService CriarScoreService() => new(
        _subprefeituraRepoMock.Object, _leituraRepoMock.Object, _scoreRepoMock.Object,
        NullLogger<ScoreService>.Instance);

    [Fact]
    public async Task CalcularEPersistirAsync_SubprefeituraInexistente_LancaException()
    {
        _subprefeituraRepoMock.Setup(r => r.ObterComUltimaLeituraAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Subprefeitura?)null);

        await CriarScoreService().Invoking(s => s.CalcularEPersistirAsync(Guid.NewGuid()))
            .Should().ThrowAsync<InvalidOperationException>().WithMessage("*não encontrada*");
    }

    [Fact]
    public async Task CalcularEPersistirAsync_SemLeituraDisponivel_LancaException()
    {
        var sub = new Subprefeitura { Nome = "Sé" }; // Leituras vazia
        _subprefeituraRepoMock.Setup(r => r.ObterComUltimaLeituraAsync(sub.Id)).ReturnsAsync(sub);

        await CriarScoreService().Invoking(s => s.CalcularEPersistirAsync(sub.Id))
            .Should().ThrowAsync<InvalidOperationException>().WithMessage("*Nenhuma leitura*");
    }

    // ── Regiao.GetScoreAgregado: MAX das subprefeituras ativas ──

    [Fact]
    public void GetScoreAgregado_SemSubprefeituras_RetornaZero()
        => new Regiao { Nome = "Norte" }.GetScoreAgregado().Should().Be(0);

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
        foreach (var v in new[] { 45.0, 75, 30 })
        {
            var sub = new Subprefeitura { Ativa = true };
            sub.Scores.Add(new ScorePerigo { Valor = v, Timestamp = DateTime.UtcNow });
            regiao.Subprefeituras.Add(sub);
        }
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
