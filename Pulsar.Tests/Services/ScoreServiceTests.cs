using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Domain.Score;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Services;

public class ScoreServiceTests
{
    private static readonly DateTime Agora = new(2026, 10, 1, 18, 0, 0, DateTimeKind.Utc);

    private static LeituraClimatica L(double minutosAtras, double chuva, double vento = 0, double sens = 20)
        => new() { ChuvaMmH = chuva, VentoKmH = vento, SensacaoTermica = sens, VisibilidadeKm = 10,
                   Timestamp = Agora.AddMinutes(-minutosAtras) };

    [Fact]
    public void MontarEntrada_SomaJanelasPelaUltimaLeitura()
    {
        // 4 leituras de 20 mm/h na última hora => 20 mm; mais 8 de 4 mm/h entre 1h e 3h => +8 mm.
        var leituras = new List<LeituraClimatica>();
        for (var i = 0; i < 4; i++) leituras.Add(L(i * 15, 20));
        for (var i = 4; i < 12; i++) leituras.Add(L(i * 15, 4));
        leituras.Add(L(30 * 60, 8)); // 30h atrás: só entra no 48h

        var e = ScoreService.MontarEntrada("Sé", leituras);

        e.Chuva1hMm.Should().BeApproximately(20, 1e-9);
        e.Chuva3hMm.Should().BeApproximately(28, 1e-9);
        e.Chuva48hMm.Should().BeApproximately(30, 1e-9);
        e.Subprefeitura.Should().Be("Sé");
    }

    [Fact]
    public void MontarEntrada_ComLacunaNoColetor_SomaSoOQueExiste()
    {
        // Coletor parado entre 15 min e 2h atrás: 3h acumula só as leituras presentes.
        var leituras = new List<LeituraClimatica> { L(0, 12), L(150, 12) };

        var e = ScoreService.MontarEntrada("Sé", leituras);

        e.Chuva1hMm.Should().BeApproximately(3, 1e-9);
        e.Chuva3hMm.Should().BeApproximately(6, 1e-9);
    }

    [Fact]
    public void MontarEntrada_ChuvaNegativaPorDadoRuim_ContaComoZero()
    {
        var e = ScoreService.MontarEntrada("Sé", [L(0, -5), L(15, 8)]);
        e.Chuva1hMm.Should().BeApproximately(2, 1e-9);
    }

    [Fact]
    public void MontarEntrada_VentoESensacaoVemDaUltimaLeitura()
    {
        var e = ScoreService.MontarEntrada("Sé", [L(15, 0, vento: 10, sens: 25), L(0, 0, vento: 70, sens: 38)]);
        e.VentoKmH.Should().Be(70);
        e.SensacaoC.Should().Be(38);
    }

    [Fact]
    public async Task CalcularEPersistir_GravaComponentesEPrincipal()
    {
        var subId = Guid.NewGuid();
        var ultima = L(0, 20);
        var sub = new Subprefeitura { Id = subId, Nome = "Sé", Leituras = [ultima] };

        var subRepo = new Mock<ISubprefeituraRepository>();
        subRepo.Setup(r => r.ObterComUltimaLeituraAsync(subId)).ReturnsAsync(sub);
        var leituraRepo = new Mock<ILeituraRepository>();
        leituraRepo.Setup(r => r.ObterHistoricoAsync(subId, 48)).ReturnsAsync([L(15, 20), ultima]);
        var scoreRepo = new Mock<IScoreRepository>();
        ScorePerigo? gravado = null;
        scoreRepo.Setup(r => r.AdicionarAsync(It.IsAny<ScorePerigo>()))
            .Callback<ScorePerigo>(s => gravado = s).Returns(Task.CompletedTask);

        var svc = new ScoreService(subRepo.Object, leituraRepo.Object, scoreRepo.Object, Mock.Of<IRiscoCelulasService>(), NullLogger<ScoreService>.Instance);
        var score = await svc.CalcularEPersistirAsync(subId);

        gravado.Should().BeSameAs(score);
        score.PerigoPrincipal.Should().Be(TipoPerigo.ALAGAMENTO);
        score.FaixaAlagamento.Should().Be(FaixaRisco.ALTO, "10 mm na última hora já é ALTO na calibração atual");
        score.Faixa.Should().Be(score.FaixaAlagamento);
        score.Valor.Should().Be(score.ValorAlagamento);
        score.Chuva3hMm.Should().BeApproximately(10, 1e-9);
        score.LeituraId.Should().Be(ultima.Id);
        scoreRepo.Verify(r => r.SalvarAsync(), Times.Once);
    }

    [Fact]
    public async Task CalcularEPersistir_SemLeituraNoHistorico_UsaAUltima()
    {
        // O histórico pode vir vazio (ex.: janela pedida antes da gravação); a última leitura
        // da subprefeitura ainda precisa entrar na conta.
        var subId = Guid.NewGuid();
        var ultima = L(0, 4);
        var sub = new Subprefeitura { Id = subId, Nome = "Sé", Leituras = [ultima] };
        var subRepo = new Mock<ISubprefeituraRepository>();
        subRepo.Setup(r => r.ObterComUltimaLeituraAsync(subId)).ReturnsAsync(sub);
        var leituraRepo = new Mock<ILeituraRepository>();
        leituraRepo.Setup(r => r.ObterHistoricoAsync(subId, 48)).ReturnsAsync([]);
        var scoreRepo = new Mock<IScoreRepository>();

        var svc = new ScoreService(subRepo.Object, leituraRepo.Object, scoreRepo.Object, Mock.Of<IRiscoCelulasService>(), NullLogger<ScoreService>.Instance);
        var score = await svc.CalcularEPersistirAsync(subId);

        score.Chuva3hMm.Should().BeApproximately(1, 1e-9);
    }

    // Chuva forte de modelo (ALTO pela área) com vento de 60 km/h, para o principal poder trocar.
    private static (ScoreService svc, Guid subId) ComTrechos(Mock<IRiscoCelulasService> celulas)
    {
        var subId = Guid.NewGuid();
        var ultima = L(0, 20, vento: 60);
        var sub = new Subprefeitura { Id = subId, Nome = "Sé", Leituras = [ultima] };
        var subRepo = new Mock<ISubprefeituraRepository>();
        subRepo.Setup(r => r.ObterComUltimaLeituraAsync(subId)).ReturnsAsync(sub);
        var leituraRepo = new Mock<ILeituraRepository>();
        leituraRepo.Setup(r => r.ObterHistoricoAsync(subId, 48)).ReturnsAsync([L(15, 20, vento: 60), ultima]);
        return (new ScoreService(subRepo.Object, leituraRepo.Object, new Mock<IScoreRepository>().Object, celulas.Object, NullLogger<ScoreService>.Instance), subId);
    }

    // O número oficial da área é o meio-termo dos trechos: estações marcando zero derrubam
    // o alagamento que o modelo dava, e o principal passa a ser o vento.
    [Fact]
    public async Task CalcularEPersistir_ComTrechos_GravaOMeioTermoEReescolheOPrincipal()
    {
        var celulas = new Mock<IRiscoCelulasService>();
        celulas.Setup(c => c.AlagamentoDaAreaAsync("Sé", It.IsAny<EntradaScore>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AlagamentoArea(ComponenteScore.De(0), 0));
        var (svc, subId) = ComTrechos(celulas);

        var score = await svc.CalcularEPersistirAsync(subId);

        score.ValorAlagamento.Should().Be(0);
        score.FaixaAlagamento.Should().Be(FaixaRisco.BAIXO);
        score.ValorVento.Should().BeGreaterThan(0);
        score.PerigoPrincipal.Should().Be(TipoPerigo.VENTO);
        score.Valor.Should().Be(score.ValorVento);
        score.Chuva3hMm.Should().BeApproximately(10, 1e-9, "a chuva guardada continua sendo a do modelo");
        score.Chuva3hMedidaMm.Should().Be(0, "e ao lado dela, a medida que fez o número");
    }

    [Fact]
    public async Task CalcularEPersistir_NumeroPeloModelo_ChuvaMedidaNula()
    {
        var celulas = new Mock<IRiscoCelulasService>();
        celulas.Setup(c => c.AlagamentoDaAreaAsync("Sé", It.IsAny<EntradaScore>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AlagamentoArea(ComponenteScore.De(90), null));
        var (svc, subId) = ComTrechos(celulas);

        var score = await svc.CalcularEPersistirAsync(subId);

        score.ValorAlagamento.Should().Be(90);
        score.Chuva3hMedidaMm.Should().BeNull();
    }

    [Fact]
    public async Task CalcularEPersistir_AreaSemTrechos_ValeAContaDaArea()
    {
        var (svc, subId) = ComTrechos(new Mock<IRiscoCelulasService>()); // devolve null

        var score = await svc.CalcularEPersistirAsync(subId);

        score.FaixaAlagamento.Should().Be(FaixaRisco.ALTO);
        score.PerigoPrincipal.Should().Be(TipoPerigo.ALAGAMENTO);
    }

    // A conta por trecho é melhoria; se ela quebrar, o ciclo não pode ficar sem score.
    [Fact]
    public async Task CalcularEPersistir_ContaPorTrechoFalha_ValeAContaDaArea()
    {
        var celulas = new Mock<IRiscoCelulasService>();
        celulas.Setup(c => c.AlagamentoDaAreaAsync(It.IsAny<string>(), It.IsAny<EntradaScore>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));
        var (svc, subId) = ComTrechos(celulas);

        var score = await svc.CalcularEPersistirAsync(subId);

        score.FaixaAlagamento.Should().Be(FaixaRisco.ALTO);
    }
}
