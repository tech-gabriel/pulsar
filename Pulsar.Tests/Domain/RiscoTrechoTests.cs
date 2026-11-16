using FluentAssertions;
using Pulsar.API.Domain.Chuva;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.Tests.Domain;

public class RiscoTrechoTests
{
    private const double GrauPorKm = 1 / 111.0;

    // Chuva forte de modelo: 30 mm em 1 h, 45 em 3 h, 60 em 48 h.
    private static readonly EntradaScore Modelo = new(30, 45, 60, 0, 20, "Campo Limpo");

    private static CelulaGrade Celula(double fator, string h3 = "c") => new(h3, -23.5, -46.4, "Campo Limpo", fator);

    private static EstacaoChuva Estacao(double km, double mm1h, double mm3h, double? mm48h = null)
        => new("E", -23.5 + km * GrauPorKm, -46.4, mm1h, mm3h, mm48h);

    private static double DoModelo(double fator) => CalculadoraScore.Calcular(Modelo, CalibracaoScore.Atual, fator).Alagamento.Valor;

    [Fact]
    public void DaArea_SemEstacao_UsaOModeloComOFatorDoTrecho()
    {
        var trechos = RiscoTrecho.DaArea(Modelo, [Celula(1), Celula(1.25)], []);

        trechos.Should().HaveCount(2);
        trechos[0].Risco.Valor.Should().BeApproximately(DoModelo(1), 1e-9);
        trechos[1].Risco.Valor.Should().BeApproximately(DoModelo(1.25), 1e-9);
        trechos[0].Estacao.Should().BeNull();
        DoModelo(1).Should().BeGreaterThan(0); // a premissa do teste
    }

    // "A medida manda": o pluviômetro ao lado dizendo que não chove vale mais que o modelo.
    [Fact]
    public void DaArea_EstacaoPertoMarcandoZero_TrechoFicaBaixoMesmoComModeloAlto()
    {
        var estacao = Estacao(2, 0, 0, 0);

        var trecho = RiscoTrecho.DaArea(Modelo, [Celula(1.25)], [estacao])[0];

        trecho.Risco.Valor.Should().Be(0);
        trecho.Risco.Faixa.Should().Be(FaixaRisco.BAIXO);
        trecho.Estacao.Should().Be(estacao);
    }

    [Fact]
    public void DaArea_EstacaoPertoComChuva_ValeAMedida()
    {
        var seco = Modelo with { Chuva1hMm = 0, Chuva3hMm = 0, Chuva48hMm = 0 };
        var estacao = Estacao(2, 40, 60, 80);

        var trecho = RiscoTrecho.DaArea(seco, [Celula(1)], [estacao])[0];

        trecho.Risco.Valor.Should().BeApproximately(RiscoTrecho.ComChuvaMedida(seco, estacao, 1).Valor, 1e-9);
        trecho.Risco.Valor.Should().BeGreaterThan(0);
    }

    [Fact]
    public void DaArea_EstacaoAlemDoRaio_NaoConta()
    {
        var trecho = RiscoTrecho.DaArea(Modelo, [Celula(1)], [Estacao(6, 0, 0, 0)])[0];

        trecho.Estacao.Should().BeNull();
        trecho.Risco.Valor.Should().BeApproximately(DoModelo(1), 1e-9);
    }

    [Fact]
    public void MeioTermoDaArea_EhAMediaDoQuartoMaisAlto()
    {
        var trechos = RiscoTrecho.DaArea(Modelo, [Celula(1), Celula(1), Celula(1), Celula(1.25)], []);

        var area = RiscoTrecho.MeioTermoDaArea(trechos);

        area.Alagamento.Valor.Should().BeApproximately(DoModelo(1.25), 1e-9); // ceil(4/4) = 1: só o maior
        area.Alagamento.Faixa.Should().Be(ClassificacaoRisco.Faixa(DoModelo(1.25)));
        area.Chuva3hMedidaMm.Should().BeNull("nenhum trecho tem estação: o número é do modelo");
    }

    [Fact]
    public void ComAlagamento_MenorQueOVento_PrincipalViraVento()
    {
        var r = new ResultadoScore(ComponenteScore.De(80), ComponenteScore.De(40), ComponenteScore.De(10), TipoPerigo.ALAGAMENTO);

        var novo = r.ComAlagamento(ComponenteScore.De(5));

        novo.Alagamento.Valor.Should().Be(5);
        novo.Principal.Should().Be(TipoPerigo.VENTO);
        novo.Vento.Should().Be(r.Vento);
        novo.Calor.Should().Be(r.Calor);
    }

    [Fact]
    public void ComAlagamento_EmpateComVento_FicaAlagamento()
    {
        var r = new ResultadoScore(ComponenteScore.De(0), ComponenteScore.De(40), ComponenteScore.De(10), TipoPerigo.VENTO);

        r.ComAlagamento(ComponenteScore.De(40)).Principal.Should().Be(TipoPerigo.ALAGAMENTO);
    }

    // O número da área vem do quarto mais alto dos trechos. Se a maior parte deles tem estação, a
    // chuva que explica o número é a medida (média das estações deles); senão, a do modelo.
    [Fact]
    public void MeioTermoDaArea_TrechosDoTopoComEstacao_TrazAChuvaMedidaDeles()
    {
        var seco = Modelo with { Chuva1hMm = 0, Chuva3hMm = 0, Chuva48hMm = 0 };
        var perto = Estacao(1, 20, 40, 50);
        var trechos = RiscoTrecho.DaArea(seco, [Celula(1, "a"), Celula(1, "b"), Celula(1, "c"), Celula(1, "d")], [perto]);

        var area = RiscoTrecho.MeioTermoDaArea(trechos);

        area.Chuva3hMedidaMm.Should().Be(40);
        area.Alagamento.Valor.Should().BeGreaterThan(0);
    }

    [Fact]
    public void MeioTermoDaArea_TopoSemEstacao_ChuvaMedidaNula()
    {
        // Oito trechos: o topo são os dois de fator 1,25, longe da estação (que está a 6 km).
        var celulas = Enumerable.Range(0, 6).Select(i => Celula(1, $"x{i}"))
            .Append(new CelulaGrade("y1", -23.5 + 6 * GrauPorKm, -46.4, "Campo Limpo", 1.25))
            .Append(new CelulaGrade("y2", -23.5 + 6 * GrauPorKm, -46.4, "Campo Limpo", 1.25))
            .ToList();
        var trechos = RiscoTrecho.DaArea(Modelo, celulas, [Estacao(0, 0, 0, 0)]);

        var area = RiscoTrecho.MeioTermoDaArea(trechos);

        area.Chuva3hMedidaMm.Should().BeNull();
        area.Alagamento.Valor.Should().BeApproximately(DoModelo(1.25), 1e-9);
    }
    // O posto do CGE da área entra na conta: vale a maior das duas (crítica de 15/11).
    private static readonly EntradaScore Seco = new(0, 0, 0, 0, 20, "Campo Limpo");
    private static AlagamentoArea Area(double valor, double? mm3h) => new(ComponenteScore.De(valor), mm3h);

    [Fact]
    public void ComPosto_PostoMediuMais_GanhaENomeiaOPosto()
    {
        var r = RiscoTrecho.ComPosto(Area(10, 4), Seco, new PostoNaArea("Ipiranga", 12.3, 15.8));
        r.Posto.Should().Be("Ipiranga");
        r.Chuva3hMedidaMm.Should().Be(15.8);
        r.Alagamento.Valor.Should().BeGreaterThan(10);
    }

    [Fact]
    public void ComPosto_TrechosMaisAltos_FicamOsTrechos()
    {
        var trechos = Area(90, 40);
        RiscoTrecho.ComPosto(trechos, Seco, new PostoNaArea("Ipiranga", 1, 2)).Should().BeSameAs(trechos);
    }

    [Fact]
    public void ComPosto_SemPosto_FicamOsTrechos()
    {
        var trechos = Area(30, 9.4);
        RiscoTrecho.ComPosto(trechos, Seco, null).Should().BeSameAs(trechos);
    }

    [Fact]
    public void ComPosto_EmpateEmZero_ValeAChuvaMaior()
    {
        var r = RiscoTrecho.ComPosto(Area(0, 0.2), Seco, new PostoNaArea("Ipiranga", 0.1, 0.4));
        r.Posto.Should().Be("Ipiranga");
    }
}
