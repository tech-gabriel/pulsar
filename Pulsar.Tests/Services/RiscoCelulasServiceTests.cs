using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class RiscoCelulasServiceTests : IDisposable
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private readonly PulsarDbContext _ctx;
    private readonly Subprefeitura _sub;
    private readonly FalhaAoSalvar _falha = new();

    private sealed class FalhaAoSalvar : Microsoft.EntityFrameworkCore.Diagnostics.SaveChangesInterceptor
    {
        public bool Ligada { get; set; }

        public override ValueTask<Microsoft.EntityFrameworkCore.Diagnostics.InterceptionResult<int>> SavingChangesAsync(
            Microsoft.EntityFrameworkCore.Diagnostics.DbContextEventData dados,
            Microsoft.EntityFrameworkCore.Diagnostics.InterceptionResult<int> resultado, CancellationToken ct = default)
            => Ligada ? throw new DbUpdateException("boom") : base.SavingChangesAsync(dados, resultado, ct);
    }

    public RiscoCelulasServiceTests()
    {
        _conn.Open();
        _ctx = new PulsarDbContext(new DbContextOptionsBuilder<PulsarDbContext>().UseSqlite(_conn).AddInterceptors(_falha).Options);
        _ctx.Database.EnsureCreated();
        _sub = _ctx.Subprefeituras.First(s => s.Nome == "Campo Limpo"); // fator 1,15: diferente do das células falsas, para ValorArea não se confundir com elas
    }

    public void Dispose()
    {
        _ctx.Dispose();
        _conn.Dispose();
    }

    private sealed class GradeFalsa(params double[] fatores) : IGradeCelulas
    {
        public IReadOnlyList<CelulaGrade> DaArea(string nome)
            => nome == "Campo Limpo"
                ? fatores.Select((f, i) => new CelulaGrade($"c{i}", -23.5, -46.4, nome, f)).ToList()
                : [];
    }

    private RiscoCelulasService Servico(params double[] fatores) => new(_ctx, new GradeFalsa(fatores));

    // 12 leituras de 15 min nas últimas 3 h; mm = ChuvaMmH × 0,25.
    private async Task<List<LeituraClimatica>> SemearLeiturasAsync(double chuvaMmH)
    {
        var agora = DateTime.UtcNow;
        var leituras = Enumerable.Range(0, 12).Select(i => new LeituraClimatica
        {
            SubprefeituraId = _sub.Id, ChuvaMmH = chuvaMmH, VisibilidadeKm = 10, SensacaoTermica = 20,
            Timestamp = agora.AddMinutes(-15 * i),
        }).ToList();
        _ctx.LeiturasClimaticas.AddRange(leituras);
        await _ctx.SaveChangesAsync();
        return leituras;
    }

    [Fact]
    public async Task Registrar_SemChuva_TudoZero()
    {
        await SemearLeiturasAsync(0);

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub.Id);

        r!.ValorArea.Should().Be(0);
        r.ValorMeioTermo.Should().Be(0);
        r.ValorMaximo.Should().Be(0);
        r.Celulas.Should().Be(4);
        r.CelulasAlto.Should().Be(0);
        r.CelulasModerado.Should().Be(0);
        r.FaixaMeioTermo.Should().Be(FaixaRisco.BAIXO);
        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Registrar_ComChuva_MeioTermoEhAMediaDoQuartoMaisAlto()
    {
        var leituras = await SemearLeiturasAsync(17.5 / 3); // 17,5 mm em 3 h
        var entrada = ScoreService.MontarEntrada("Campo Limpo", leituras);
        double Celula(double fator) => CalculadoraScore.Calcular(entrada, CalibracaoScore.Atual, fator).Alagamento.Valor;

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub.Id);

        Celula(1.25).Should().BeGreaterThan(Celula(1)).And.BeGreaterThan(0); // a chuva do teste precisa separar as células
        r!.ValorArea.Should().BeApproximately(CalculadoraScore.Calcular(entrada).Alagamento.Valor, 1e-9);
        r.ValorMeioTermo.Should().BeApproximately(Celula(1.25), 1e-9); // ceil(4/4) = 1: só a maior
        r.ValorMaximo.Should().BeApproximately(Celula(1.25), 1e-9);
        r.FaixaMeioTermo.Should().Be(ClassificacaoRisco.Faixa(Celula(1.25)));
        r.Celulas.Should().Be(4);
        var faixas = new[] { 1, 1, 1, 1.25 }.Select(f => ClassificacaoRisco.Faixa(Celula(f))).ToList();
        r.CelulasAlto.Should().Be(faixas.Count(f => f == FaixaRisco.ALTO));
        r.CelulasModerado.Should().Be(faixas.Count(f => f == FaixaRisco.MODERADO));
        r.Timestamp.Should().Be(leituras.Max(l => l.Timestamp));
    }

    [Fact]
    public async Task Registrar_OitoCelulas_MeioTermoUsaAsDuasMaiores()
    {
        var leituras = await SemearLeiturasAsync(17.5 / 3);
        var entrada = ScoreService.MontarEntrada("Campo Limpo", leituras);
        double Celula(double fator) => CalculadoraScore.Calcular(entrada, CalibracaoScore.Atual, fator).Alagamento.Valor;

        var r = await Servico(1, 1, 1, 1, 1, 1, 1.1, 1.25).RegistrarAsync(_sub.Id);

        r!.ValorMeioTermo.Should().BeApproximately((Celula(1.1) + Celula(1.25)) / 2, 1e-9);
        r.ValorMaximo.Should().BeApproximately(Celula(1.25), 1e-9);
    }

    [Fact]
    public async Task Registrar_SemLeitura_NaoGravaENaoLanca()
    {
        var r = await Servico(1, 1).RegistrarAsync(_sub.Id);

        r.Should().BeNull();
        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Registrar_AreaSemCelulas_NaoGravaENaoLanca()
    {
        await SemearLeiturasAsync(5);

        var r = await Servico().RegistrarAsync(_sub.Id);

        r.Should().BeNull();
        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Podar_ApagaSoOQuePassouDe60Dias()
    {
        ResumoCelulas Resumo(int diasAtras) => new()
        {
            SubprefeituraId = _sub.Id, Timestamp = DateTime.UtcNow.AddDays(-diasAtras), Celulas = 1,
        };
        _ctx.ResumosCelulas.AddRange(Resumo(61), Resumo(59));
        await _ctx.SaveChangesAsync();

        var apagadas = await Servico(1).PodarAsync();

        apagadas.Should().Be(1);
        var sobrou = await _ctx.ResumosCelulas.AsNoTracking().SingleAsync();
        sobrou.Timestamp.Should().BeAfter(DateTime.UtcNow.AddDays(-60));
    }

    private ResumoCelulas Ciclo(int minutosAtras, double valorArea, double meioTermo, int celulasAlto = 0) => new()
    {
        SubprefeituraId = _sub.Id, Timestamp = DateTime.UtcNow.AddMinutes(-minutosAtras), Celulas = 75,
        ValorArea = valorArea, ValorMeioTermo = meioTermo, FaixaMeioTermo = ClassificacaoRisco.Faixa(meioTermo),
        ValorMaximo = meioTermo, CelulasAlto = celulasAlto,
    };

    [Fact]
    public async Task Resumir_ContaCiclosEDivergencias()
    {
        _ctx.ResumosCelulas.AddRange(
            Ciclo(15, valorArea: 10, meioTermo: 12),
            Ciclo(30, valorArea: 25, meioTermo: 70, celulasAlto: 9), // área tranquila, meio-termo em alerta
            Ciclo(45, valorArea: 40, meioTermo: 45, celulasAlto: 2));
        await _ctx.SaveChangesAsync();

        var linhas = await Servico(1).ResumirAsync(7);

        var l = linhas.Should().ContainSingle().Subject;
        l.Subprefeitura.Should().Be("Campo Limpo");
        l.Celulas.Should().Be(75);
        l.Ciclos.Should().Be(3);
        l.MaxValorArea.Should().Be(40);
        l.MaxMeioTermo.Should().Be(70);
        l.CiclosAreaAlto.Should().Be(0);
        l.CiclosMeioTermoAlto.Should().Be(1);
        l.CiclosFaixaDiferente.Should().Be(1);
        l.MaxCelulasAlto.Should().Be(9);
    }

    [Fact]
    public async Task Resumir_ForaDaJanela_NaoEntra()
    {
        _ctx.ResumosCelulas.Add(Ciclo(minutosAtras: 3 * 24 * 60, valorArea: 80, meioTermo: 90));
        await _ctx.SaveChangesAsync();

        (await Servico(1).ResumirAsync(2)).Should().BeEmpty();
        (await Servico(1).ResumirAsync(7)).Should().ContainSingle();
    }

    [Fact]
    public async Task Resumir_OrdenaPelasAreasQueMaisDivergem()
    {
        var mooca = _ctx.Subprefeituras.First(s => s.Nome == "Mooca");
        var divergente = Ciclo(15, valorArea: 25, meioTermo: 70);
        divergente.SubprefeituraId = mooca.Id;
        _ctx.ResumosCelulas.AddRange(Ciclo(15, valorArea: 10, meioTermo: 12), divergente);
        await _ctx.SaveChangesAsync();

        var linhas = await Servico(1).ResumirAsync(7);

        linhas.Select(l => l.Subprefeitura).Should().Equal("Mooca", "Campo Limpo");
    }

    // O serviço divide o DbContext do ciclo com score, agregado e previsão. Um resumo que
    // falhou ao gravar não pode ficar preso no contexto: o próximo SaveChanges o regravaria
    // e falharia junto, e a parte invisível derrubaria a visível.
    [Fact]
    public async Task Registrar_FalhaAoGravar_NaoDeixaOResumoPresoNoContexto()
    {
        await SemearLeiturasAsync(5);
        _falha.Ligada = true;

        await FluentActions.Awaiting(() => Servico(1, 1).RegistrarAsync(_sub.Id)).Should().ThrowAsync<DbUpdateException>();

        _falha.Ligada = false;
        _ctx.ChangeTracker.Entries<ResumoCelulas>().Should().BeEmpty();
        await _ctx.SaveChangesAsync();
        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(0);
    }

    // Coleta que falhou não traz leitura nova: gravar de novo o mesmo retrato inflaria a
    // contagem de ciclos da tela de conferência.
    [Fact]
    public async Task Registrar_SemLeituraNova_NaoDuplica()
    {
        await SemearLeiturasAsync(5);

        (await Servico(1, 1).RegistrarAsync(_sub.Id)).Should().NotBeNull();
        (await Servico(1, 1).RegistrarAsync(_sub.Id)).Should().BeNull();

        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(1);
    }
}
