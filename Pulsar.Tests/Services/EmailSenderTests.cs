using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using MimeKit;
using Pulsar.API.Services.Email;

namespace Pulsar.Tests.Services;

public class EmailSenderTests
{
    private static EmailOptions OpcoesPadrao() => new()
    {
        Host = "smtp.gmail.com",
        Port = 587,
        FromName = "Pulsar",
        FromEmail = "pulsar@exemplo.com"
    };

    // ── SmtpEmailSender.MontarMensagem ──────────────────────────────

    [Fact]
    public void MontarMensagem_DefineRemetenteDestinatarioEAssunto()
    {
        var msg = SmtpEmailSender.MontarMensagem(OpcoesPadrao(), "user@teste.com", "Recuperação de senha", "<p>Olá</p>");

        msg.From.Mailboxes.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new { Name = "Pulsar", Address = "pulsar@exemplo.com" });
        msg.To.Mailboxes.Should().ContainSingle().Which.Address.Should().Be("user@teste.com");
        msg.Subject.Should().Be("Recuperação de senha");
    }

    [Fact]
    public void MontarMensagem_IncluiCorpoHtml()
    {
        var msg = SmtpEmailSender.MontarMensagem(OpcoesPadrao(), "user@teste.com", "Assunto", "<p>Conteúdo <b>rico</b></p>");

        msg.HtmlBody.Should().Contain("<b>rico</b>");
    }

    [Fact]
    public void MontarMensagem_GeraFallbackTextoSemTags()
    {
        var msg = SmtpEmailSender.MontarMensagem(OpcoesPadrao(), "user@teste.com", "Assunto", "<p>Clique <a href='x'>aqui</a>.</p>");

        msg.TextBody.Should().NotContain("<");
        msg.TextBody.Should().Contain("Clique");
        msg.TextBody.Should().Contain("aqui");
    }

    [Fact]
    public void MontarMensagem_MensagemEhMultipartAlternative()
    {
        var msg = SmtpEmailSender.MontarMensagem(OpcoesPadrao(), "user@teste.com", "Assunto", "<p>Oi</p>");

        msg.Body.Should().BeOfType<MultipartAlternative>();
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
