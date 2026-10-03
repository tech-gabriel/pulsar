using FluentAssertions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class OcorrenciaConsultaServiceTests
{
    private readonly Mock<IOcorrenciaAlagamentoRepository> _repoMock = new();
    private readonly Mock<ISubprefeituraRepository> _subRepoMock = new();
    private readonly Mock<IScoreRepository> _scoreRepoMock = new();

    private OcorrenciaConsultaService CriarServico()
        => new(_repoMock.Object, _subRepoMock.Object, _scoreRepoMock.Object);

    private static OcorrenciaAlagamento Oco(double lat, double lon,
        TipoOcorrenciaAlagamento tipo = TipoOcorrenciaAlagamento.ALAGAMENTO)
        => new() { CdIdentificador = Guid.NewGuid().ToString(), Tipo = tipo,
                   Latitude = lat, Longitude = lon, DataOcorrencia = DateTime.UtcNow.AddDays(-10) };

    // Sé (centro) como ponto de referência.
    private const double Lat = -23.5484;
    private const double Lon = -46.6399;

    [Fact]
    public async Task ObterProximas_ContaSoDentroDoRaio()
    {
        _repoMock.Setup(r => r.ObterRecentesAsync(It.IsAny<int>())).ReturnsAsync([
            Oco(Lat, Lon),                    // 0 m
            Oco(Lat + 0.001, Lon),            // ~111 m
            Oco(Lat + 0.05, Lon),             // ~5.5 km (fora)
        ]);
        _subRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([]);

        var res = await CriarServico().ObterProximasAsync(Lat, Lon, 500);

        res.Total.Should().Be(2);
        res.MaisProximaMetros.Should().BeApproximately(0, 1);
    }

    [Fact]
    public async Task ObterProximas_SemOcorrencias_NaoTemRiscoElevado()
    {
        _repoMock.Setup(r => r.ObterRecentesAsync(It.IsAny<int>())).ReturnsAsync([]);
        _subRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([]);

        var res = await CriarServico().ObterProximasAsync(Lat, Lon, 500);

        res.Total.Should().Be(0);
        res.RiscoElevado.Should().BeFalse();
    }

    [Theory]
    [InlineData(FaixaRisco.BAIXO, false)]
    [InlineData(FaixaRisco.MODERADO, true)]
    [InlineData(FaixaRisco.ALTO, true)]
    public async Task ObterProximas_RiscoElevadoSegueFaixaDeAlagamento(FaixaRisco faixa, bool esperado)
    {
        _repoMock.Setup(r => r.ObterRecentesAsync(It.IsAny<int>())).ReturnsAsync([Oco(Lat, Lon)]);
        var sub = new Subprefeitura { Id = Guid.NewGuid(), Nome = "Sé", Latitude = Lat, Longitude = Lon };
        sub.Leituras.Add(new LeituraClimatica { ChuvaMmH = 12, Timestamp = DateTime.UtcNow });
        _subRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([sub]);
        _subRepoMock.Setup(r => r.ObterComUltimaLeituraAsync(sub.Id)).ReturnsAsync(sub);
        // Principal ALTO de propósito: vale a faixa de ALAGAMENTO, não a principal.
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub.Id))
            .ReturnsAsync(new ScorePerigo { FaixaAlagamento = faixa, Faixa = FaixaRisco.ALTO, Timestamp = DateTime.UtcNow });

        var res = await CriarServico().ObterProximasAsync(Lat, Lon, 500);

        res.RiscoElevado.Should().Be(esperado);
        res.ChuvaMmH.Should().Be(12);
    }

    [Fact]
    public async Task ObterProximas_ScoreELeituraVelhos_NaoContamComoAgora()
    {
        // Coleta travada: o último score ALTO e a última chuva são de 2h atrás.
        var antigo = DateTime.UtcNow.AddHours(-2);
        _repoMock.Setup(r => r.ObterRecentesAsync(It.IsAny<int>())).ReturnsAsync([Oco(Lat, Lon)]);
        var sub = new Subprefeitura { Id = Guid.NewGuid(), Nome = "Sé", Latitude = Lat, Longitude = Lon };
        sub.Leituras.Add(new LeituraClimatica { ChuvaMmH = 30, Timestamp = antigo });
        _subRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([sub]);
        _subRepoMock.Setup(r => r.ObterComUltimaLeituraAsync(sub.Id)).ReturnsAsync(sub);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub.Id))
            .ReturnsAsync(new ScorePerigo { FaixaAlagamento = FaixaRisco.ALTO, Timestamp = antigo });

        var res = await CriarServico().ObterProximasAsync(Lat, Lon, 500);

        res.RiscoElevado.Should().BeFalse();
        res.ChuvaMmH.Should().BeNull();
    }

    [Fact]
    public async Task ObterProximas_SemScore_NaoMarcaRiscoElevado()
    {
        _repoMock.Setup(r => r.ObterRecentesAsync(It.IsAny<int>())).ReturnsAsync([Oco(Lat, Lon)]);
        var sub = new Subprefeitura { Id = Guid.NewGuid(), Nome = "Sé", Latitude = Lat, Longitude = Lon };
        _subRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([sub]);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub.Id)).ReturnsAsync((ScorePerigo?)null);

        var res = await CriarServico().ObterProximasAsync(Lat, Lon, 500);

        res.RiscoElevado.Should().BeFalse();
    }

    [Fact]
    public async Task ObterRecentes_MapeiaParaDto()
    {
        _repoMock.Setup(r => r.ObterRecentesAsync(It.IsAny<int>()))
            .ReturnsAsync([Oco(Lat, Lon, TipoOcorrenciaAlagamento.INUNDACAO)]);

        var lista = await CriarServico().ObterRecentesAsync();

        lista.Should().ContainSingle();
        lista[0].Tipo.Should().Be(TipoOcorrenciaAlagamento.INUNDACAO);
        lista[0].Latitude.Should().Be(Lat);
    }
}
