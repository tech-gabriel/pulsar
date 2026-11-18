using FluentAssertions;
using Pulsar.Calibracao;

namespace Pulsar.Tests.Calibracao;

public class FonteAlagamentosBaixadaTests
{
    private const string Cabecalho = "data;municipio;fonte;descricao\n";

    [Fact]
    public void Ler_AgrupaPorArea_ComAsNoveChaves()
    {
        var r = FonteAlagamentosBaixada.Ler(Cabecalho
            + "2026-02-23;Santos;https://x.com/a;ruas alagadas\n"
            + "2026-02-23;Guarujá;https://x.com/a;idem\n"
            + "\n"
            + "2026-02-24;Santos;https://x.com/b;idem\n");

        r.Keys.Should().BeEquivalentTo(Baixada.Todas.Select(b => b.Nome));
        r["Santos"].Should().BeEquivalentTo(new[] { new DateOnly(2026, 2, 23), new DateOnly(2026, 2, 24) });
        r["Peruíbe"].Should().BeEmpty();
    }

    // Linha ruim nunca é ignorada em silêncio: um dia a menos muda a calibração.
    [Theory]
    [InlineData("2026-13-01;Santos;https://x;d")]
    [InlineData("2026-02-23;Mooca;https://x;d")]
    [InlineData("2026-02-23;Santos;;d")]
    [InlineData("2026-02-23;Santos")]
    public void Ler_LinhaRuim_FalhaComONumeroDaLinha(string linha)
        => FluentActions.Invoking(() => FonteAlagamentosBaixada.Ler(Cabecalho + linha))
            .Should().Throw<FormatException>().WithMessage("*linha 2*");

    [Fact]
    public void ArquivoReal_LeSemErro()
    {
        var r = FonteAlagamentosBaixada.Ler(File.ReadAllText(FonteAlagamentosBaixada.Arquivo(AppContext.BaseDirectory)));

        r.Values.Sum(d => d.Count).Should().BeGreaterThan(0);
    }

    // Sem o cabeçalho esperado, a primeira linha de dado sumiria em silêncio: falha com mensagem.
    [Fact]
    public void Ler_SemOCabecalho_Falha()
    {
        var acao = () => FonteAlagamentosBaixada.Ler("2026-02-23;Santos;https://x.com/a;ruas alagadas\n2026-02-24;Santos;https://x.com/b;idem\n");
        acao.Should().Throw<FormatException>().WithMessage("*cabeçalho*");
    }
}
