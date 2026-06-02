using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class NoticiaServiceTests
{
    private readonly Mock<INoticiaClient> _clientMock = new();
    private readonly IMemoryCache _cache = new MemoryCache(new MemoryCacheOptions());

    private NoticiaService CriarService() =>
        new(_clientMock.Object, _cache, NullLogger<NoticiaService>.Instance);

    private static IReadOnlyList<NoticiaDto> NoticiasFake() =>
        [new NoticiaDto { Titulo = "Notícia 1", Link = "https://x/1" }];

    [Fact]
    public async Task ObterNoticiasAsync_PrimeiraChamada_ConsultaOClient()
    {
        _clientMock.Setup(c => c.ObterNoticiasAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(NoticiasFake());
        var service = CriarService();

        var resultado = await service.ObterNoticiasAsync();

        resultado.Should().HaveCount(1);
        _clientMock.Verify(c => c.ObterNoticiasAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ObterNoticiasAsync_SegundaChamada_UsaCacheNaoConsultaClientNovamente()
    {
        _clientMock.Setup(c => c.ObterNoticiasAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(NoticiasFake());
        var service = CriarService();

        await service.ObterNoticiasAsync();
        var segunda = await service.ObterNoticiasAsync();

        segunda.Should().HaveCount(1);
        _clientMock.Verify(c => c.ObterNoticiasAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
