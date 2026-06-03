using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Pulsar.API.Services.Email;

namespace Pulsar.Tests.Services;

public class EmailSenderTests
{
    private static EmailOptions OpcoesPadrao() => new()
    {
        ApiKey = "re_teste",
        FromName = "Pulsar",
        FromEmail = "pulsar@exemplo.com"
    };

    // ── ResendEmailSender.MontarMensagem ────────────────────────────

    [Fact]
    public void Resend_MontarMensagem_DefineRemetenteComNomeEDestinatario()
    {
        var msg = ResendEmailSender.MontarMensagem(OpcoesPadrao(), "user@teste.com", "Recuperação de senha", "<p>Olá</p>");

        msg.From.DisplayName.Should().Be("Pulsar");
        msg.From.Email.Should().Be("pulsar@exemplo.com");
        msg.To.Should().ContainSingle().Which.Email.Should().Be("user@teste.com");
        msg.Subject.Should().Be("Recuperação de senha");
    }

    [Fact]
    public void Resend_MontarMensagem_IncluiHtmlEFallbackTexto()
    {
        var msg = ResendEmailSender.MontarMensagem(OpcoesPadrao(), "user@teste.com", "Assunto", "<p>Clique <a href='x'>aqui</a>.</p>");

        msg.HtmlBody.Should().Contain("<a href='x'>aqui</a>");
        msg.TextBody.Should().NotContain("<");
        msg.TextBody.Should().Contain("Clique");
        msg.TextBody.Should().Contain("aqui");
    }

    // ── EmailHtml.ParaTexto ─────────────────────────────────────────

    [Theory]
    [InlineData("", "")]
    [InlineData("   ", "")]
    public void ParaTexto_EntradaVazia_RetornaVazio(string html, string esperado)
    {
        EmailHtml.ParaTexto(html).Should().Be(esperado);
    }

    [Fact]
    public void ParaTexto_RemoveTagsDecodificaEntidadesENormalizaEspacos()
    {
        var texto = EmailHtml.ParaTexto("<p>Ol&aacute;,&nbsp;&nbsp;<b>mundo</b>!</p>");

        texto.Should().Be("Olá, mundo !");
    }

    // ── LogEmailSender ──────────────────────────────────────────────

    [Fact]
    public async Task LogEmailSender_EnviarAsync_NaoLancaExcecao()
    {
        var sender = new LogEmailSender(NullLogger<LogEmailSender>.Instance);

        var act = async () => await sender.EnviarAsync("user@teste.com", "Assunto", "<p>Oi</p>");

        await act.Should().NotThrowAsync();
    }
}
