using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Chuva;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

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

    // As células falsas ficam todas em (-23,5; -46,4). Sem estações, a conta é a da entrega 1.
    private const double GrauPorKm = 1 / 111.0;
    private readonly List<EstacaoChuva> _estacoes = [];
    private readonly Mock<ICemadenService> _cemaden = new();

    private static EstacaoChuva Estacao(double km, double mm1h, double mm3h, double? mm48h)
        => new("E", -23.5 + km * GrauPorKm, -46.4, mm1h, mm3h, mm48h);

    private RiscoCelulasService Servico(params double[] fatores)
    {
        if (!_cemaden.Setups.Any())
            _cemaden.Setup(c => c.ObterEstacoesComChuvaAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ReturnsAsync(() => _estacoes);
        return new(_ctx, new GradeFalsa(fatores), _cemaden.Object, NullLogger<RiscoCelulasService>.Instance);
    }

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

    // O score que o ciclo acabou de gravar para a área: o serviço parte dele em vez de
    // refazer a conta e reler o banco.
    private ScorePerigo Score(List<LeituraClimatica> leituras)
    {
        var entrada = ScoreService.MontarEntrada(_sub.Nome, leituras);
        return new ScorePerigo
        {
            SubprefeituraId = _sub.Id, Timestamp = leituras.Max(l => l.Timestamp), Chuva48hMm = entrada.Chuva48hMm,
            ValorAlagamento = CalculadoraScore.Calcular(entrada).Alagamento.Valor,
        };
    }

    // Tempo seco é a maior parte do ano. Gravar 32 linhas de zeros a cada 15 minutos só
    // encheria o banco: sem chuva o serviço nem consulta as leituras.
    [Fact]
    public async Task Registrar_SemChuva_NaoGrava()
    {
        var leituras = await SemearLeiturasAsync(0);

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub, Score(leituras));

        r.Should().BeNull();
        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(0);
    }

    // Garoa em que a área e todos os trechos ficam em risco baixo: os dois cálculos
    // concordam e não há o que conferir.
    [Fact]
    public async Task Registrar_ChuvaFracaComTudoEmRiscoBaixo_NaoGrava()
    {
        var leituras = await SemearLeiturasAsync(1); // 3 mm em 3 h
        var entrada = ScoreService.MontarEntrada("Campo Limpo", leituras);
        CalculadoraScore.Calcular(entrada, CalibracaoScore.Atual, 1.25).Alagamento.Faixa.Should().Be(FaixaRisco.BAIXO); // a premissa do teste

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub, Score(leituras));

        r.Should().BeNull();
        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Registrar_ComChuva_MeioTermoEhAMediaDoQuartoMaisAlto()
    {
        var leituras = await SemearLeiturasAsync(17.5 / 3); // 17,5 mm em 3 h
        var entrada = ScoreService.MontarEntrada("Campo Limpo", leituras);
        double Celula(double fator) => CalculadoraScore.Calcular(entrada, CalibracaoScore.Atual, fator).Alagamento.Valor;

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub, Score(leituras));

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

        var r = await Servico(1, 1, 1, 1, 1, 1, 1.1, 1.25).RegistrarAsync(_sub, Score(leituras));

        r!.ValorMeioTermo.Should().BeApproximately((Celula(1.1) + Celula(1.25)) / 2, 1e-9);
        r.ValorMaximo.Should().BeApproximately(Celula(1.25), 1e-9);
    }

    [Fact]
    public async Task Registrar_SemLeitura_NaoGravaENaoLanca()
    {
        var r = await Servico(1, 1).RegistrarAsync(_sub, new ScorePerigo { Chuva48hMm = 20, ValorAlagamento = 70, Timestamp = DateTime.UtcNow });

        r.Should().BeNull();
        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Registrar_AreaSemCelulas_NaoGravaENaoLanca()
    {
        var leituras = await SemearLeiturasAsync(17.5 / 3);

        var r = await Servico().RegistrarAsync(_sub, Score(leituras));

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
        var leituras = await SemearLeiturasAsync(17.5 / 3);
        _falha.Ligada = true;

        await FluentActions.Awaiting(() => Servico(1, 1.25).RegistrarAsync(_sub, Score(leituras))).Should().ThrowAsync<DbUpdateException>();

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
        var leituras = await SemearLeiturasAsync(17.5 / 3);

        (await Servico(1, 1.25).RegistrarAsync(_sub, Score(leituras))).Should().NotBeNull();
        (await Servico(1, 1.25).RegistrarAsync(_sub, Score(leituras))).Should().BeNull();

        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(1);
    }

    // ---------- Chuva medida (entrega 2) ----------

    private static double Medido(EntradaScore modelo, EstacaoChuva e, double fator)
        => CalculadoraScore.Calcular(
            modelo with { Chuva1hMm = e.Mm1h, Chuva3hMm = e.Mm3h, Chuva48hMm = e.Mm48h ?? modelo.Chuva48hMm },
            CalibracaoScore.Atual, fator).Alagamento.Valor;

    // O caso que justifica a entrega: o modelo não viu a chuva e a estação do trecho mediu.
    [Fact]
    public async Task Registrar_ModeloSecoEEstacaoComChuvaForte_GravaComAMedidaEmAlerta()
    {
        var leituras = await SemearLeiturasAsync(0);
        var estacao = Estacao(km: 1, mm1h: 40, mm3h: 60, mm48h: 80);
        _estacoes.Add(estacao);
        var esperado = Medido(ScoreService.MontarEntrada("Campo Limpo", leituras), estacao, 1.25);
        ClassificacaoRisco.Faixa(esperado).Should().Be(FaixaRisco.ALTO); // a premissa do teste

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub, Score(leituras));

        r!.ValorMeioTermo.Should().Be(0);
        r.CelulasComMedida.Should().Be(4);
        r.ValorMeioTermoMedida.Should().BeApproximately(esperado, 1e-9);
        r.ValorMeioTermoMaior.Should().BeApproximately(esperado, 1e-9);
        r.CelulasAltoMedida.Should().BeGreaterThan(0);
        r.CelulasAltoMaior.Should().Be(r.CelulasAltoMedida);
        r.Chuva3hModeloMm.Should().Be(0);
        r.Chuva3hMedidaMm.Should().Be(60);
    }

    // O contrário: o modelo inventou chuva e a estação do trecho está seca. "Medida" derruba
    // o risco; "maior" mantém. São esses dois números que o Gabriel compara.
    [Fact]
    public async Task Registrar_ModeloComChuvaEEstacaoSeca_MedidaZeraEMaiorMantem()
    {
        var leituras = await SemearLeiturasAsync(17.5 / 3);
        _estacoes.Add(Estacao(km: 1, mm1h: 0, mm3h: 0, mm48h: 0));

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub, Score(leituras));

        r!.ValorMeioTermo.Should().BeGreaterThan(0);
        r.ValorMeioTermoMedida.Should().Be(0);
        r.CelulasAltoMedida.Should().Be(0);
        r.ValorMeioTermoMaior.Should().BeApproximately(r.ValorMeioTermo, 1e-9);
        r.CelulasAltoMaior.Should().Be(r.CelulasAlto);
        r.Chuva3hModeloMm.Should().BeApproximately(17.5, 1e-9);
        r.Chuva3hMedidaMm.Should().Be(0);
    }

    [Fact]
    public async Task Registrar_EstacaoLongeDoTrecho_FicaComOModelo()
    {
        var leituras = await SemearLeiturasAsync(17.5 / 3);
        _estacoes.Add(Estacao(km: RiscoCelulasService.RaioEstacaoKm + 1, mm1h: 40, mm3h: 60, mm48h: 80));

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub, Score(leituras));

        r!.CelulasComMedida.Should().Be(0);
        r.ValorMeioTermoMedida.Should().BeApproximately(r.ValorMeioTermo, 1e-9);
        r.ValorMeioTermoMaior.Should().BeApproximately(r.ValorMeioTermo, 1e-9);
        r.Chuva3hMedidaMm.Should().BeNull();
    }

    [Fact]
    public async Task Registrar_EstacaoSemAs48h_UsaASaturacaoDoModelo()
    {
        var leituras = await SemearLeiturasAsync(17.5 / 3);
        var estacao = Estacao(km: 1, mm1h: 25, mm3h: 45, mm48h: null);
        _estacoes.Add(estacao);

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub, Score(leituras));

        r!.ValorMeioTermoMedida.Should().BeApproximately(Medido(ScoreService.MontarEntrada("Campo Limpo", leituras), estacao, 1.25), 1e-9);
    }

    // A chuva medida é um complemento: o CEMADEN fora do ar não pode custar a conta do modelo.
    [Fact]
    public async Task Registrar_FalhaAoLerAsEstacoes_CalculaSoComOModelo()
    {
        var leituras = await SemearLeiturasAsync(17.5 / 3);
        _cemaden.Setup(c => c.ObterEstacoesComChuvaAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())).ThrowsAsync(new InvalidOperationException("boom"));

        var r = await Servico(1, 1, 1, 1.25).RegistrarAsync(_sub, Score(leituras));

        r!.CelulasComMedida.Should().Be(0);
        r.ValorMeioTermoMedida.Should().BeApproximately(r.ValorMeioTermo, 1e-9);
    }

    [Fact]
    public async Task Registrar_SecoNoModeloENaEstacao_NaoGrava()
    {
        var leituras = await SemearLeiturasAsync(0);
        _estacoes.Add(Estacao(km: 1, mm1h: 0, mm3h: 0, mm48h: 12));

        (await Servico(1, 1.25).RegistrarAsync(_sub, Score(leituras))).Should().BeNull();
        (await _ctx.ResumosCelulas.CountAsync()).Should().Be(0);
    }

    // São 32 áreas por ciclo com o mesmo serviço: as estações são lidas uma vez, não 32.
    [Fact]
    public async Task Registrar_VariasAreasNoMesmoCiclo_LeAsEstacoesUmaVez()
    {
        var leituras = await SemearLeiturasAsync(17.5 / 3);
        var servico = Servico(1, 1.25);

        await servico.RegistrarAsync(_sub, Score(leituras));
        await servico.RegistrarAsync(_sub, Score(leituras));

        _cemaden.Verify(c => c.ObterEstacoesComChuvaAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Resumir_TrazAsDuasRegrasDaChuvaMedida()
    {
        var a = Ciclo(15, valorArea: 10, meioTermo: 12);
        (a.CelulasComMedida, a.Chuva3hModeloMm, a.Chuva3hMedidaMm, a.ValorMeioTermoMedida, a.ValorMeioTermoMaior) = (40, 2, 30, 70, 70);
        var b = Ciclo(30, valorArea: 62, meioTermo: 65);
        (b.CelulasComMedida, b.Chuva3hModeloMm, b.Chuva3hMedidaMm, b.ValorMeioTermoMedida, b.ValorMeioTermoMaior) = (38, 25, null, 5, 65);
        _ctx.ResumosCelulas.AddRange(a, b);
        await _ctx.SaveChangesAsync();

        var l = (await Servico(1).ResumirAsync(7)).Should().ContainSingle().Subject;

        l.MaxCelulasComMedida.Should().Be(40);
        l.MaxChuva3hModeloMm.Should().Be(25);
        l.MaxChuva3hMedidaMm.Should().Be(30);
        l.MaxMeioTermoMedida.Should().Be(70);
        l.MaxMeioTermoMaior.Should().Be(70);
        l.CiclosMedidaAlto.Should().Be(1);
        l.CiclosMaiorAlto.Should().Be(2);
    }
}
