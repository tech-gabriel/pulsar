using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Data;

namespace Pulsar.Tests.Repositories;

/// <summary>
/// Ciclo em que a coleta da área falha: não há leitura nova, e o score sai de novo com o mesmo
/// horário de leitura. Com o alagamento pelos trechos ele pode mudar (as estações mudaram), então
/// "o mais recente" precisa ser o último gravado, não um dos dois ao acaso.
/// </summary>
public class UltimoScoreTests : IDisposable
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly PulsarDbContext _ctx;
    private readonly Subprefeitura _sub;

    public UltimoScoreTests()
    {
        _conn.Open();
        _ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(_conn).Options);
        _ctx.Database.EnsureCreated();
        _sub = _ctx.Subprefeituras.First(s => s.Nome == "Santo Amaro");
    }

    public void Dispose()
    {
        _ctx.Dispose();
        _conn.Dispose();
    }

    private async Task GravarDoisComOMesmoHorarioAsync()
    {
        var leitura = new LeituraClimatica { SubprefeituraId = _sub.Id, VisibilidadeKm = 10, Timestamp = DateTime.UtcNow.AddMinutes(-5) };
        _ctx.LeiturasClimaticas.Add(leitura);
        await _ctx.SaveChangesAsync();
        ScorePerigo Score(double valor) => new()
        {
            SubprefeituraId = _sub.Id, LeituraId = leitura.Id, Timestamp = leitura.Timestamp,
            Valor = valor, ValorAlagamento = valor, Faixa = valor > 60 ? FaixaRisco.ALTO : FaixaRisco.BAIXO,
        };
        _ctx.ScoresPerigo.Add(Score(7));
        await _ctx.SaveChangesAsync();
        await Task.Delay(20); // CriadoEm vem do relógio no SaveChanges
        _ctx.ScoresPerigo.Add(Score(65));
        await _ctx.SaveChangesAsync();
        _ctx.ChangeTracker.Clear();
    }

    [Fact]
    public async Task ScoreRepository_MesmoHorarioDeLeitura_DevolveOUltimoGravado()
    {
        await GravarDoisComOMesmoHorarioAsync();

        (await new ScoreRepository(_ctx).ObterUltimoAsync(_sub.Id))!.Valor.Should().Be(65);
    }

    [Fact]
    public async Task SubprefeituraRepository_MesmoHorarioDeLeitura_ResumoTrazOUltimoGravado()
    {
        await GravarDoisComOMesmoHorarioAsync();

        var areas = await new SubprefeituraRepository(_ctx).ObterAtivasComResumoAsync();
        areas.Single(a => a.Id == _sub.Id).GetUltimoScore()!.Valor.Should().Be(65);

        _ctx.ChangeTracker.Clear();
        var comLeitura = await new SubprefeituraRepository(_ctx).ObterComUltimaLeituraAsync(_sub.Id);
        comLeitura!.GetUltimoScore()!.Valor.Should().Be(65);
    }

    [Fact]
    public void GetUltimoScore_MesmoHorario_DesempataPeloUltimoGravado()
    {
        var t = DateTime.UtcNow;
        var sub = new Subprefeitura
        {
            // O antigo primeiro: sem o desempate, a ordenação estável devolveria ele.
            Scores = [new ScorePerigo { Timestamp = t, CriadoEm = t, Valor = 7 }, new ScorePerigo { Timestamp = t, CriadoEm = t.AddMinutes(4), Valor = 65 }],
        };

        sub.GetUltimoScore()!.Valor.Should().Be(65);
    }
}
