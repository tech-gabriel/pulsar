using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Scheduler;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Scheduler;

/// <summary>
/// Extremo na hora (E4b): quando a leitura traz um alerta Extremo novo, o job chama o motor de
/// push no mesmo ciclo, sem esperar o ciclo de 15 min da coleta.
/// </summary>
public class AlertasOficiaisJobTests
{
    private sealed class ServicoFalso(int novosExtremos) : IAlertaOficialService
    {
        public Task<ResultadoSincronizacao> SincronizarAsync(DateTime agoraUtc, CancellationToken ct = default)
            => Task.FromResult(new ResultadoSincronizacao(true, novosExtremos, 0, true, novosExtremos));
        public Task<IReadOnlyDictionary<Guid, IReadOnlyList<AlertaOficial>>> AtivosPorAreaAsync(DateTime agoraUtc, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyDictionary<Guid, IReadOnlyList<AlertaOficial>>>(new Dictionary<Guid, IReadOnlyList<AlertaOficial>>());
    }

    private sealed class MotorFalso : IMotorNotificacoes
    {
        public int Chamadas;
        public Task<int> AvaliarEDispararAsync(CancellationToken ct = default) { Chamadas++; return Task.FromResult(0); }
    }

    private static async Task<int> Ciclo(int novosExtremos)
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        var motor = new MotorFalso();
        var servicos = new ServiceCollection()
            .AddDbContext<PulsarDbContext>(o => o.UseSqlite(conn))
            .AddSingleton<IAlertaOficialService>(new ServicoFalso(novosExtremos))
            .AddSingleton<IMotorNotificacoes>(motor)
            .BuildServiceProvider();
        using (var scope = servicos.CreateScope()) scope.ServiceProvider.GetRequiredService<PulsarDbContext>().Database.EnsureCreated();
        var job = new AlertasOficiaisJob(servicos.GetRequiredService<IServiceScopeFactory>(), NullLogger<AlertasOficiaisJob>.Instance);
        await job.ExecutarUmCicloAsync(CancellationToken.None);
        return motor.Chamadas;
    }

    [Fact]
    public async Task AlertaExtremoNovo_DisparaOMotorNoMesmoCiclo() => (await Ciclo(1)).Should().Be(1);

    [Fact]
    public async Task SemExtremoNovo_NaoChamaOMotor() => (await Ciclo(0)).Should().Be(0);
}
