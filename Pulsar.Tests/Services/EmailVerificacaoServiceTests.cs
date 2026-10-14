using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Services;

public class EmailVerificacaoServiceTests
{
    private readonly Mock<IUsuarioRepository> _usuarios = new();
    private readonly Mock<ITokenVerificacaoEmailRepository> _tokens = new();
    private readonly Mock<IEmailSender> _email = new();

    private EmailVerificacaoService Criar(params string[] admins) => new(
        _usuarios.Object, _tokens.Object, _email.Object,
        Options.Create(new RecuperacaoSenhaOptions { UrlBaseFrontend = "https://app.test" }),
        new ConfigurationBuilder().AddInMemoryCollection(
            admins.Select((e, i) => new KeyValuePair<string, string?>($"Admin:Emails:{i}", e))).Build(),
        NullLogger<EmailVerificacaoService>.Instance);

    private static Usuario NovoUsuario(string email = "ana@x.com")
        => new() { Nome = "Ana", Email = email, SenhaHash = "h" };

    private TokenVerificacaoEmail TokenNoRepo(string bruto, Usuario u, string email, DateTime? expira = null, DateTime? usado = null)
    {
        var t = new TokenVerificacaoEmail
        {
            UsuarioId = u.Id, Usuario = u, Email = email,
            TokenHash = PasswordResetService.CalcularHash(bruto),
            ExpiraEm = expira ?? DateTime.UtcNow.AddHours(1), UsadoEm = usado,
        };
        _tokens.Setup(r => r.ObterPorTokenHashAsync(t.TokenHash)).ReturnsAsync(t);
        return t;
    }

    // ── Enviar ──

    [Fact]
    public async Task Enviar_CriaToken48hParaODestinoEMandaOLink()
    {
        var u = NovoUsuario();
        TokenVerificacaoEmail? salvo = null;
        _tokens.Setup(r => r.AdicionarAsync(It.IsAny<TokenVerificacaoEmail>()))
            .Callback<TokenVerificacaoEmail>(t => salvo = t).Returns(Task.CompletedTask);
        string? html = null;
        _email.Setup(s => s.EnviarAsync("novo@x.com", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<string, string, string, CancellationToken>((_, _, h, _) => html = h).Returns(Task.CompletedTask);

        await Criar().EnviarConfirmacaoAsync(u, " Novo@X.com ");

        _tokens.Verify(r => r.InvalidarPendentesDoUsuarioAsync(u.Id), Times.Once);
        salvo!.Email.Should().Be("novo@x.com");
        salvo.ExpiraEm.Should().BeCloseTo(DateTime.UtcNow.AddHours(48), TimeSpan.FromMinutes(1));
        html.Should().Contain("https://app.test/confirmar-email?token=");
        html.Should().NotContain(salvo.TokenHash); // o link leva o token bruto, nunca o hash
    }

    [Fact]
    public async Task Enviar_NoTetoPorHora_NaoEnvia()
    {
        var u = NovoUsuario();
        _tokens.Setup(r => r.ContarCriadosDesdeAsync(u.Id, It.IsAny<DateTime>()))
            .ReturnsAsync(EmailVerificacaoService.MaxEnviosPorHora);

        await Criar().EnviarConfirmacaoAsync(u, u.Email);

        _tokens.Verify(r => r.AdicionarAsync(It.IsAny<TokenVerificacaoEmail>()), Times.Never);
        _email.Verify(s => s.EnviarAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Enviar_NomeComHtml_EhEscapado()
    {
        var u = NovoUsuario();
        u.Nome = "<b>Ana</b>";
        string? html = null;
        _email.Setup(s => s.EnviarAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<string, string, string, CancellationToken>((_, _, h, _) => html = h).Returns(Task.CompletedTask);

        await Criar().EnviarConfirmacaoAsync(u, u.Email);

        html.Should().NotContain("<b>Ana</b>").And.Contain("&lt;b&gt;Ana&lt;/b&gt;");
    }

    // ── Confirmar ──

    [Fact]
    public async Task Confirmar_TokenDoEmailAtual_VerificaEMarcaUsado()
    {
        var u = NovoUsuario();
        var t = TokenNoRepo("bruto", u, u.Email);

        await Criar().ConfirmarAsync("bruto");

        u.EmailVerificado.Should().BeTrue();
        t.UsadoEm.Should().NotBeNull();
        _tokens.Verify(r => r.SalvarAsync(), Times.Once);
    }

    [Theory]
    [InlineData("expirado")]
    [InlineData("usado")]
    [InlineData("inexistente")]
    [InlineData("emailMudou")]
    public async Task Confirmar_LinkInvalido_LancaArgumentESemVerificar(string caso)
    {
        var u = NovoUsuario();
        if (caso == "expirado") TokenNoRepo("bruto", u, u.Email, expira: DateTime.UtcNow.AddMinutes(-1));
        if (caso == "usado") TokenNoRepo("bruto", u, u.Email, usado: DateTime.UtcNow);
        if (caso == "emailMudou") TokenNoRepo("bruto", u, "antigo@x.com");

        var act = () => Criar().ConfirmarAsync("bruto");

        await act.Should().ThrowAsync<ArgumentException>();
        u.EmailVerificado.Should().BeFalse();
    }

    [Fact]
    public async Task Confirmar_EmailPendente_TrocaOEmail()
    {
        var u = NovoUsuario();
        u.EmailVerificado = true;
        u.EmailPendente = "novo@x.com";
        TokenNoRepo("bruto", u, "novo@x.com");

        await Criar().ConfirmarAsync("bruto");

        u.Email.Should().Be("novo@x.com");
        u.EmailPendente.Should().BeNull();
        u.EmailVerificado.Should().BeTrue();
    }

    [Fact]
    public async Task Confirmar_EmailPendenteTomadoPorOutraConta_FalhaSemConsumirOToken()
    {
        var u = NovoUsuario();
        u.EmailPendente = "novo@x.com";
        var t = TokenNoRepo("bruto", u, "novo@x.com");
        _usuarios.Setup(r => r.ObterPorEmailAsync("novo@x.com")).ReturnsAsync(NovoUsuario("novo@x.com"));

        var act = () => Criar().ConfirmarAsync("bruto");

        await act.Should().ThrowAsync<InvalidOperationException>();
        u.Email.Should().Be("ana@x.com");
        t.UsadoEm.Should().BeNull();
        _tokens.Verify(r => r.SalvarAsync(), Times.Never);
    }

    [Fact]
    public async Task Confirmar_EmailDaListaAdmin_PromoveAAdmin()
    {
        var u = NovoUsuario("admin@x.com");
        TokenNoRepo("bruto", u, u.Email);

        await Criar("admin@x.com").ConfirmarAsync("bruto");

        u.Role.Should().Be(RoleAcesso.ADMIN);
    }

    // ── Reenviar ──

    [Fact]
    public async Task Reenviar_ComPendente_VaiParaOPendente_SemPendenteENaoVerificado_VaiParaOAtual()
    {
        var comPendente = NovoUsuario();
        comPendente.EmailVerificado = true;
        comPendente.EmailPendente = "novo@x.com";
        var naoVerificado = NovoUsuario("bia@x.com");
        _usuarios.Setup(r => r.ObterPorIdAsync(comPendente.Id)).ReturnsAsync(comPendente);
        _usuarios.Setup(r => r.ObterPorIdAsync(naoVerificado.Id)).ReturnsAsync(naoVerificado);

        await Criar().ReenviarAsync(comPendente.Id);
        await Criar().ReenviarAsync(naoVerificado.Id);

        _email.Verify(s => s.EnviarAsync("novo@x.com", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _email.Verify(s => s.EnviarAsync("bia@x.com", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Reenviar_ContaVerificadaSemPendente_NaoEnvia()
    {
        var u = NovoUsuario();
        u.EmailVerificado = true;
        _usuarios.Setup(r => r.ObterPorIdAsync(u.Id)).ReturnsAsync(u);

        await Criar().ReenviarAsync(u.Id);

        _email.Verify(s => s.EnviarAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
