using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Scheduler;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Scheduler;

/// <summary>Cada rodada do sync fica gravada, e a falha volta em 2 h em vez de 24 h.</summary>
public sealed class SincronizacaoOcorrenciasJobTests : IDisposable
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly Mock<IOcorrenciaIngestionService> _ingestao = new();
    private readonly ServiceProvider _sp;

    public SincronizacaoOcorrenciasJobTests()
    {
        _conn.Open();
        var services = new ServiceCollection();
        services.AddDbContext<PulsarDbContext>(o => o.UseSqlite(_conn));
        services.AddScoped(_ => _ingestao.Object);
        _sp = services.BuildServiceProvider();
        using var scope = _sp.CreateScope();
        scope.ServiceProvider.GetRequiredService<PulsarDbContext>().Database.EnsureCreated();
    }

    private SincronizacaoOcorrenciasJob Job() =>
        new(_sp.GetRequiredService<IServiceScopeFactory>(), NullLogger<SincronizacaoOcorrenciasJob>.Instance);

    private List<ExecucaoSincronizacao> Execucoes()
    {
        using var scope = _sp.CreateScope();
        return [.. scope.ServiceProvider.GetRequiredService<PulsarDbContext>().ExecucoesSincronizacao];
    }

    [Fact]
    public async Task Sucesso_GravaAsContagens_EVoltaEm24h()
    {
        _ingestao.Setup(s => s.SincronizarAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OcorrenciaSincronizacaoDto { Total = 590, Novas = 2 });

        var espera = await Job().ExecutarAsync(CancellationToken.None);

        espera.Should().Be(TimeSpan.FromHours(24));
        var e = Execucoes().Single();
        e.Should().BeEquivalentTo(new { Fonte = "geosampa", Sucesso = true, Lidas = 590, Novas = 2, Erro = (string?)null });
    }

    [Fact]
    public async Task Falha_GravaOErro_EVoltaEm2h()
    {
        _ingestao.Setup(s => s.SincronizarAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("GeoSampa indisponível: as duas camadas falharam."));

        var espera = await Job().ExecutarAsync(CancellationToken.None);

        espera.Should().Be(SincronizacaoOcorrenciasJob.IntervaloAposFalha);
        var e = Execucoes().Single();
        e.Sucesso.Should().BeFalse();
        e.Erro.Should().Contain("GeoSampa indisponível");
    }

    [Fact]
    public async Task ApagaExecucoesComMaisDe90Dias()
    {
        using (var scope = _sp.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<PulsarDbContext>();
            db.ExecucoesSincronizacao.Add(new ExecucaoSincronizacao { Fonte = "geosampa", IniciadoEm = DateTime.UtcNow.AddDays(-91), Sucesso = true });
            await db.SaveChangesAsync();
        }
        _ingestao.Setup(s => s.SincronizarAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new OcorrenciaSincronizacaoDto());

        await Job().ExecutarAsync(CancellationToken.None);

        Execucoes().Should().ContainSingle().Which.IniciadoEm.Should().BeAfter(DateTime.UtcNow.AddDays(-1));
    }

    public void Dispose()
    {
        _sp.Dispose();
        _conn.Dispose();
    }
}
