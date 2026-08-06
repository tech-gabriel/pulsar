using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class OcorrenciaIngestionServiceTests
{
    private readonly Mock<IGeoSampaClient> _clientMock = new();
    private readonly Mock<IOcorrenciaAlagamentoRepository> _repoMock = new();

    private OcorrenciaIngestionService CriarServico()
        => new(_clientMock.Object, _repoMock.Object, NullLogger<OcorrenciaIngestionService>.Instance);

    private static OcorrenciaAlagamento Nova(TipoOcorrenciaAlagamento tipo)
        => new() { CdIdentificador = Guid.NewGuid().ToString(), Tipo = tipo, FonteOriginal = "SIGRC" };

    [Fact]
    public async Task Sincronizar_ChamaUpsertEContaPorTipo()
    {
        _clientMock.Setup(c => c.ObterOcorrenciasAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                Nova(TipoOcorrenciaAlagamento.ALAGAMENTO),
                Nova(TipoOcorrenciaAlagamento.ALAGAMENTO),
                Nova(TipoOcorrenciaAlagamento.INUNDACAO),
            ]);

        var resultado = await CriarServico().SincronizarAsync();

        resultado.Total.Should().Be(3);
        resultado.Alagamentos.Should().Be(2);
        resultado.Inundacoes.Should().Be(1);
        _repoMock.Verify(r => r.UpsertRangeAsync(It.IsAny<IEnumerable<OcorrenciaAlagamento>>()), Times.Once);
    }

    [Fact]
    public async Task Sincronizar_SemDados_NaoFalha()
    {
        _clientMock.Setup(c => c.ObterOcorrenciasAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var resultado = await CriarServico().SincronizarAsync();

        resultado.Total.Should().Be(0);
    }
}
