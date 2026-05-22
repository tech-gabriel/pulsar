using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.Tests.Scheduler;

/// <summary>
/// Cobre o comportamento de falha parcial (UC-07) e tratamento de
/// leituras inválidas (VisibilidadeKm <= 0) do ClimateService.
/// </summary>
public class ClimateServiceTests
{
    private readonly Mock<IWeatherClient> _weatherClientMock = new();
    private readonly Mock<ISubprefeituraRepository> _subprefeituraRepoMock = new();
    private readonly Mock<ILeituraRepository> _leituraRepoMock = new();

    private ClimateService CriarClimateService() => new(
        _weatherClientMock.Object,
        _subprefeituraRepoMock.Object,
        _leituraRepoMock.Object,
        NullLogger<ClimateService>.Instance);

    private static DadosClimaticosDto DadosValidos(double visib = 5) => new()
    {
        ChuvaMmH = 10,
        VentoKmH = 20,
        VisibilidadeKm = visib,
        IndiceUv = 3,
        Timestamp = DateTime.UtcNow
    };

    private static Subprefeitura NovaSubprefeitura(double lat = -23.5, double lon = -46.6)
        => new() { Nome = "Sub Teste", Latitude = lat, Longitude = lon, Ativa = true };

    // ──────────────────────────────────────────────
    // ColetarTodasAsync — falha parcial
    // ──────────────────────────────────────────────

    [Fact]
    public async Task ColetarTodasAsync_FalhaEmUmaSubprefeitura_ContinuaParaOutras()
    {
        var sub1 = NovaSubprefeitura(-23.5, -46.6);
        var sub2 = NovaSubprefeitura(-23.6, -46.5); // vai falhar
        var sub3 = NovaSubprefeitura(-23.7, -46.4);

        _subprefeituraRepoMock.Setup(r => r.ObterAtivasAsync())
            .ReturnsAsync([sub1, sub2, sub3]);

        _subprefeituraRepoMock.Setup(r => r.ObterPorIdAsync(sub1.Id)).ReturnsAsync(sub1);
        _subprefeituraRepoMock.Setup(r => r.ObterPorIdAsync(sub2.Id)).ReturnsAsync(sub2);
        _subprefeituraRepoMock.Setup(r => r.ObterPorIdAsync(sub3.Id)).ReturnsAsync(sub3);

        // sub2 lança exceção; sub1 e sub3 ok
        _weatherClientMock
            .Setup(c => c.ObterDadosAsync(sub1.Latitude, sub1.Longitude, It.IsAny<CancellationToken>()))
            .ReturnsAsync(DadosValidos());
        _weatherClientMock
            .Setup(c => c.ObterDadosAsync(sub2.Latitude, sub2.Longitude, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Timeout simulado"));
        _weatherClientMock
            .Setup(c => c.ObterDadosAsync(sub3.Latitude, sub3.Longitude, It.IsAny<CancellationToken>()))
            .ReturnsAsync(DadosValidos());

        _leituraRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<LeituraClimatica>())).Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.LimparHistoricoAntigoAsync(It.IsAny<Guid>(), It.IsAny<int>())).Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarClimateService();

        // Não deve lançar exceção mesmo com falha parcial
        await sut.Invoking(s => s.ColetarTodasAsync()).Should().NotThrowAsync();

        // Apenas sub1 e sub3 tiveram leitura persistida
        _leituraRepoMock.Verify(r => r.AdicionarAsync(It.IsAny<LeituraClimatica>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ColetarTodasAsync_TodasFalham_NaoLancaExcecao()
    {
        var sub = NovaSubprefeitura();

        _subprefeituraRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([sub]);
        _subprefeituraRepoMock.Setup(r => r.ObterPorIdAsync(sub.Id)).ReturnsAsync(sub);
        _weatherClientMock
            .Setup(c => c.ObterDadosAsync(It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Servidor indisponível"));

        var sut = CriarClimateService();

        await sut.Invoking(s => s.ColetarTodasAsync()).Should().NotThrowAsync();
        _leituraRepoMock.Verify(r => r.AdicionarAsync(It.IsAny<LeituraClimatica>()), Times.Never);
    }

    [Fact]
    public async Task ColetarTodasAsync_SemSubprefeiuras_NaoFazNada()
    {
        _subprefeituraRepoMock.Setup(r => r.ObterAtivasAsync())
            .ReturnsAsync(Enumerable.Empty<Subprefeitura>());

        var sut = CriarClimateService();

        await sut.Invoking(s => s.ColetarTodasAsync()).Should().NotThrowAsync();
        _weatherClientMock.Verify(c => c.ObterDadosAsync(
            It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ──────────────────────────────────────────────
    // ColetarDadosAsync — tratamento de leitura inválida
    // ──────────────────────────────────────────────

    [Fact]
    public async Task ColetarDadosAsync_VisibilidadeZero_SubstituiPor10km()
    {
        var sub = NovaSubprefeitura();
        LeituraClimatica? leituraCapturada = null;

        _subprefeituraRepoMock.Setup(r => r.ObterPorIdAsync(sub.Id)).ReturnsAsync(sub);
        _weatherClientMock
            .Setup(c => c.ObterDadosAsync(sub.Latitude, sub.Longitude, It.IsAny<CancellationToken>()))
            .ReturnsAsync(DadosValidos(visib: 0)); // visibilidade = 0 (inválido)

        _leituraRepoMock
            .Setup(r => r.AdicionarAsync(It.IsAny<LeituraClimatica>()))
            .Callback<LeituraClimatica>(l => leituraCapturada = l)
            .Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.LimparHistoricoAntigoAsync(It.IsAny<Guid>(), It.IsAny<int>())).Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarClimateService();
        await sut.ColetarDadosAsync(sub.Id);

        leituraCapturada.Should().NotBeNull();
        leituraCapturada!.VisibilidadeKm.Should().Be(10.0);
    }

    [Fact]
    public async Task ColetarDadosAsync_VisibilidadeNegativa_SubstituiPor10km()
    {
        var sub = NovaSubprefeitura();
        LeituraClimatica? leituraCapturada = null;

        _subprefeituraRepoMock.Setup(r => r.ObterPorIdAsync(sub.Id)).ReturnsAsync(sub);
        _weatherClientMock
            .Setup(c => c.ObterDadosAsync(sub.Latitude, sub.Longitude, It.IsAny<CancellationToken>()))
            .ReturnsAsync(DadosValidos(visib: -1));

        _leituraRepoMock
            .Setup(r => r.AdicionarAsync(It.IsAny<LeituraClimatica>()))
            .Callback<LeituraClimatica>(l => leituraCapturada = l)
            .Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.LimparHistoricoAntigoAsync(It.IsAny<Guid>(), It.IsAny<int>())).Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarClimateService();
        await sut.ColetarDadosAsync(sub.Id);

        leituraCapturada!.VisibilidadeKm.Should().Be(10.0);
    }

    [Fact]
    public async Task ColetarDadosAsync_VisibilidadeValida_MantémValorOriginal()
    {
        var sub = NovaSubprefeitura();
        LeituraClimatica? leituraCapturada = null;

        _subprefeituraRepoMock.Setup(r => r.ObterPorIdAsync(sub.Id)).ReturnsAsync(sub);
        _weatherClientMock
            .Setup(c => c.ObterDadosAsync(sub.Latitude, sub.Longitude, It.IsAny<CancellationToken>()))
            .ReturnsAsync(DadosValidos(visib: 3.5));

        _leituraRepoMock
            .Setup(r => r.AdicionarAsync(It.IsAny<LeituraClimatica>()))
            .Callback<LeituraClimatica>(l => leituraCapturada = l)
            .Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.LimparHistoricoAntigoAsync(It.IsAny<Guid>(), It.IsAny<int>())).Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarClimateService();
        await sut.ColetarDadosAsync(sub.Id);

        leituraCapturada!.VisibilidadeKm.Should().Be(3.5);
    }

    [Fact]
    public async Task ColetarDadosAsync_SubprefeituraInexistente_LancaException()
    {
        _subprefeituraRepoMock.Setup(r => r.ObterPorIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync((Subprefeitura?)null);

        var sut = CriarClimateService();

        await sut.Invoking(s => s.ColetarDadosAsync(Guid.NewGuid()))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*não encontrada*");
    }

    [Fact]
    public async Task ColetarDadosAsync_DadosValidos_LimpaBancoEGrava()
    {
        var sub = NovaSubprefeitura();

        _subprefeituraRepoMock.Setup(r => r.ObterPorIdAsync(sub.Id)).ReturnsAsync(sub);
        _weatherClientMock
            .Setup(c => c.ObterDadosAsync(sub.Latitude, sub.Longitude, It.IsAny<CancellationToken>()))
            .ReturnsAsync(DadosValidos());
        _leituraRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<LeituraClimatica>())).Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.LimparHistoricoAntigoAsync(It.IsAny<Guid>(), It.IsAny<int>())).Returns(Task.CompletedTask);
        _leituraRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarClimateService();
        await sut.ColetarDadosAsync(sub.Id);

        _leituraRepoMock.Verify(r => r.AdicionarAsync(It.IsAny<LeituraClimatica>()), Times.Once);
        _leituraRepoMock.Verify(r => r.LimparHistoricoAntigoAsync(sub.Id, It.IsAny<int>()), Times.Once);
        _leituraRepoMock.Verify(r => r.SalvarAsync(), Times.Once);
    }
}
