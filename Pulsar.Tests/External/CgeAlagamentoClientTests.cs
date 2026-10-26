using FluentAssertions;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.External;

/// <summary>
/// O HTML vem da página real do CGE-SP salva em 2026-10-26: 25/10 (tempestade, 9 pontos) e
/// 18/10 (um dos dias da chuva falsa, sem ponto nenhum).
/// </summary>
public class CgeAlagamentoClientTests
{
    private static string Fixture(string nome)
        => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", nome));

    [Fact]
    public void Parse_DiaDaTempestade_LeOsNovePontosPorSubprefeitura()
    {
        var pontos = CgeAlagamentoClient.Parse(Fixture("cge-alagamentos-2026-10-25.html"));

        pontos.Should().HaveCount(9);
        pontos.GroupBy(p => p.NomeSubprefeitura).ToDictionary(g => g.Key, g => g.Count())
            .Should().BeEquivalentTo(new Dictionary<string, int>
            {
                ["Santana"] = 1, ["Lapa"] = 1, ["Pinheiros"] = 3, ["Mooca"] = 3, ["Penha"] = 1,
            });
    }

    [Fact]
    public void Parse_LeHorarioViaSentidoReferenciaEStatus()
    {
        var p = CgeAlagamentoClient.Parse(Fixture("cge-alagamentos-2026-10-25.html"))[0];

        p.NomeSubprefeitura.Should().Be("Santana");
        p.Inicio.Should().Be(new TimeOnly(4, 51));
        p.Fim.Should().Be(new TimeOnly(9, 58));
        p.Via.Should().Be("MARGINAL TIETE ASCB CENTRAL");
        p.Sentido.Should().Be("A SENNA/CASTELO B");
        p.Referencia.Should().Be("PTE DAS BANDEIRAS SEN ROMEU TUMA");
        p.Ativo.Should().BeFalse();
        p.Transitavel.Should().BeFalse();
    }

    [Fact]
    public void Parse_ContaTransitaveisEIntransitaveis()
    {
        var pontos = CgeAlagamentoClient.Parse(Fixture("cge-alagamentos-2026-10-25.html"));

        // O rodapé da própria página diz: inativos, 4 transitáveis e 5 intransitáveis.
        pontos.Count(p => p.Transitavel).Should().Be(4);
        pontos.Should().OnlyContain(p => !p.Ativo);
    }

    [Fact]
    public void Parse_PontoAtivoSemHoraDeFim()
    {
        // Ponto em andamento: classe "ativo-" e só a hora de início.
        var html = Fixture("cge-alagamentos-2026-10-25.html")
            .Replace("""<li class="inativo-intransitavel" title="Inativo Intransitável">""", """<li class="ativo-intransitavel" title="Ativo Intransitável">""")
            .Replace("De 04:51 a 09:58", "De 04:51 a");

        var p = CgeAlagamentoClient.Parse(html)[0];

        p.Ativo.Should().BeTrue();
        p.Transitavel.Should().BeFalse();
        p.Inicio.Should().Be(new TimeOnly(4, 51));
        p.Fim.Should().BeNull();
    }

    [Fact]
    public void Parse_DiaSemAlagamento_Vazio()
    {
        CgeAlagamentoClient.Parse(Fixture("cge-alagamentos-vazio.html")).Should().BeEmpty();
    }

    [Fact]
    public void Parse_LayoutDesconhecido_VazioEmVezDeLancar()
    {
        CgeAlagamentoClient.Parse("<html><body>Manutenção</body></html>").Should().BeEmpty();
    }
}
