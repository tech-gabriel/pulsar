using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Pulsar.API.Domain.Alertas;
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

    private sealed class MotorFalso(bool falha = false) : IMotorNotificacoes
    {
        public int Chamadas;
        public string? SoGatilho;
        public Task<int> AvaliarEDispararAsync(CancellationToken ct = default) => AvaliarSoAsync("todos", ct);
        public Task<int> AvaliarSoAsync(string gatilho, CancellationToken ct = default)
        {
            Chamadas++;
            SoGatilho = gatilho;
            return falha ? throw new InvalidOperationException("banco fora") : Task.FromResult(0);
        }
    }

    private static async Task<int> Ciclo(int novosExtremos) => (await CicloCom(novosExtremos, new MotorFalso())).motor.Chamadas;

    private static async Task<(MotorFalso motor, TimeSpan proximo)> CicloCom(int novosExtremos, MotorFalso motor)
    {
        using var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        var servicos = new ServiceCollection()
            .AddDbContext<PulsarDbContext>(o => o.UseSqlite(conn))
            .AddSingleton<IAlertaOficialService>(new ServicoFalso(novosExtremos))
            .AddSingleton<IMotorNotificacoes>(motor)
            .BuildServiceProvider();
        using (var scope = servicos.CreateScope()) scope.ServiceProvider.GetRequiredService<PulsarDbContext>().Database.EnsureCreated();
        var job = new AlertasOficiaisJob(servicos.GetRequiredService<IServiceScopeFactory>(), NullLogger<AlertasOficiaisJob>.Instance);
        return (motor, await job.ExecutarUmCicloAsync(CancellationToken.None));
    }

    [Fact]
    public async Task AlertaExtremoNovo_DisparaOMotorNoMesmoCiclo() => (await Ciclo(1)).Should().Be(1);

    [Fact]
    public async Task SemExtremoNovo_NaoChamaOMotor() => (await Ciclo(0)).Should().Be(0);

    // Só o gatilho da Defesa Civil roda na rodada extra.
    [Fact]
    public async Task AlertaExtremoNovo_RodaSoOGatilhoDaDefesaCivil()
        => (await CicloCom(1, new MotorFalso())).motor.SoGatilho.Should().Be("alerta-oficial");

    // Falha no envio não derruba a leitura: o ritmo segue o da leitura (atento, com alerta de SP no feed).
    [Fact]
    public async Task MotorFalha_LeituraSegueNoRitmoDela()
        => (await CicloCom(1, new MotorFalso(falha: true))).proximo.Should().Be(RitmoAlertas.Atento);
}
