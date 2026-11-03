using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Interfaces;
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
            NullLogger<RotaService>.Instance);

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
}
