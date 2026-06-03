using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Services;

public class PasswordResetServiceTests
{
    private readonly Mock<IUsuarioRepository> _usuarioRepoMock = new();
    private readonly Mock<ITokenRecuperacaoSenhaRepository> _tokenRepoMock = new();
    private readonly Mock<IEmailSender> _emailSenderMock = new();

    private readonly RecuperacaoSenhaOptions _options = new()
    {
        TokenExpiracaoMinutos = 60,
        UrlBaseFrontend = "http://localhost:5173",
        CaminhoReset = "/redefinir-senha"
    };

    private PasswordResetService CriarService() => new(
        _usuarioRepoMock.Object,
        _tokenRepoMock.Object,
        _emailSenderMock.Object,
        Options.Create(_options),
        NullLogger<PasswordResetService>.Instance);

    private static Usuario NovoUsuario(string email = "user@teste.com")
        => new() { Nome = "Fulano", Email = email, SenhaHash = "hash-antigo" };

    // ── SolicitarResetAsync ─────────────────────────────────────────

    [Fact]
    public async Task SolicitarReset_EmailInexistente_NaoCriaTokenNemEnviaEmail()
    {
        _usuarioRepoMock.Setup(r => r.ObterPorEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((Usuario?)null);

        var sut = CriarService();
        await sut.SolicitarResetAsync(new EsqueciSenhaRequestDto { Email = "naoexiste@teste.com" });

        _tokenRepoMock.Verify(r => r.AdicionarAsync(It.IsAny<TokenRecuperacaoSenha>()), Times.Never);
        _emailSenderMock.Verify(s => s.EnviarAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SolicitarReset_EmailExistente_InvalidaPendentesCriaTokenEEnvia()
    {
        var usuario = NovoUsuario();
        _usuarioRepoMock.Setup(r => r.ObterPorEmailAsync(usuario.Email)).ReturnsAsync(usuario);

        var sut = CriarService();
        await sut.SolicitarResetAsync(new EsqueciSenhaRequestDto { Email = usuario.Email });

        _tokenRepoMock.Verify(r => r.InvalidarPendentesDoUsuarioAsync(usuario.Id), Times.Once);
        _tokenRepoMock.Verify(r => r.AdicionarAsync(It.Is<TokenRecuperacaoSenha>(t =>
            t.UsuarioId == usuario.Id
            && t.UsadoEm == null
            && t.ExpiraEm > DateTime.UtcNow)), Times.Once);
        _tokenRepoMock.Verify(r => r.SalvarAsync(), Times.Once);
        _emailSenderMock.Verify(s => s.EnviarAsync(
            usuario.Email, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SolicitarReset_NaoArmazenaTokenEmTextoPuro()
    {
        var usuario = NovoUsuario();
        _usuarioRepoMock.Setup(r => r.ObterPorEmailAsync(usuario.Email)).ReturnsAsync(usuario);

        TokenRecuperacaoSenha? tokenSalvo = null;
        _tokenRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<TokenRecuperacaoSenha>()))
            .Callback<TokenRecuperacaoSenha>(t => tokenSalvo = t)
            .Returns(Task.CompletedTask);

        string? linkDoEmail = null;
        _emailSenderMock.Setup(s => s.EnviarAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<string, string, string, CancellationToken>((_, _, html, _) => linkDoEmail = html)
            .Returns(Task.CompletedTask);

        var sut = CriarService();
        await sut.SolicitarResetAsync(new EsqueciSenhaRequestDto { Email = usuario.Email });

        // O hash persistido tem 64 chars (SHA-256 hex) e não aparece como tal no link do e-mail.
        tokenSalvo!.TokenHash.Should().HaveLength(64);
        linkDoEmail.Should().NotContain(tokenSalvo.TokenHash);
    }

    // ── RedefinirSenhaAsync ─────────────────────────────────────────

    private TokenRecuperacaoSenha NovoTokenValido(string tokenBruto, Usuario usuario)
        => new()
        {
            UsuarioId = usuario.Id,
            Usuario = usuario,
            TokenHash = PasswordResetService.CalcularHash(tokenBruto),
            ExpiraEm = DateTime.UtcNow.AddMinutes(30),
            UsadoEm = null
        };

    [Fact]
    public async Task RedefinirSenha_TokenValido_AtualizaSenhaEMarcaUsado()
    {
        var usuario = NovoUsuario();
        var bruto = "token-bruto-valido";
        var token = NovoTokenValido(bruto, usuario);
        _tokenRepoMock.Setup(r => r.ObterPorTokenHashAsync(PasswordResetService.CalcularHash(bruto)))
            .ReturnsAsync(token);

        var sut = CriarService();
        await sut.RedefinirSenhaAsync(new RedefinirSenhaRequestDto { Token = bruto, NovaSenha = "NovaSenha12!" });

        BCrypt.Net.BCrypt.Verify("NovaSenha12!", usuario.SenhaHash).Should().BeTrue();
        token.UsadoEm.Should().NotBeNull();
        _tokenRepoMock.Verify(r => r.SalvarAsync(), Times.Once);
    }

    [Fact]
    public async Task RedefinirSenha_TokenInexistente_LancaArgumentException()
    {
        _tokenRepoMock.Setup(r => r.ObterPorTokenHashAsync(It.IsAny<string>()))
            .ReturnsAsync((TokenRecuperacaoSenha?)null);

        var sut = CriarService();
        var act = async () => await sut.RedefinirSenhaAsync(
            new RedefinirSenhaRequestDto { Token = "qualquer", NovaSenha = "NovaSenha12!" });

        await act.Should().ThrowAsync<ArgumentException>();
        _tokenRepoMock.Verify(r => r.SalvarAsync(), Times.Never);
    }

    [Fact]
    public async Task RedefinirSenha_TokenExpirado_LancaArgumentException()
    {
        var usuario = NovoUsuario();
        var bruto = "token-expirado";
        var token = NovoTokenValido(bruto, usuario);
        token.ExpiraEm = DateTime.UtcNow.AddMinutes(-1);
        _tokenRepoMock.Setup(r => r.ObterPorTokenHashAsync(It.IsAny<string>())).ReturnsAsync(token);

        var sut = CriarService();
        var act = async () => await sut.RedefinirSenhaAsync(
            new RedefinirSenhaRequestDto { Token = bruto, NovaSenha = "NovaSenha12!" });

        await act.Should().ThrowAsync<ArgumentException>();
        usuario.SenhaHash.Should().Be("hash-antigo");
    }

    [Fact]
    public async Task RedefinirSenha_TokenJaUsado_LancaArgumentException()
    {
        var usuario = NovoUsuario();
        var bruto = "token-usado";
        var token = NovoTokenValido(bruto, usuario);
        token.UsadoEm = DateTime.UtcNow.AddMinutes(-5);
        _tokenRepoMock.Setup(r => r.ObterPorTokenHashAsync(It.IsAny<string>())).ReturnsAsync(token);

        var sut = CriarService();
        var act = async () => await sut.RedefinirSenhaAsync(
            new RedefinirSenhaRequestDto { Token = bruto, NovaSenha = "NovaSenha12!" });

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task RedefinirSenha_SenhaFraca_LancaENaoPersiste()
    {
        var usuario = NovoUsuario();
        var bruto = "token-ok";
        var token = NovoTokenValido(bruto, usuario);
        _tokenRepoMock.Setup(r => r.ObterPorTokenHashAsync(It.IsAny<string>())).ReturnsAsync(token);

        var sut = CriarService();
        var act = async () => await sut.RedefinirSenhaAsync(
            new RedefinirSenhaRequestDto { Token = bruto, NovaSenha = "fraca" });

        await act.Should().ThrowAsync<ArgumentException>();
        usuario.SenhaHash.Should().Be("hash-antigo");
        token.UsadoEm.Should().BeNull();
        _tokenRepoMock.Verify(r => r.SalvarAsync(), Times.Never);
    }

    // ── Helpers estáticos ───────────────────────────────────────────

    [Fact]
    public void CalcularHash_Deterministico_E_DiferenteDoTokenBruto()
    {
        const string bruto = "meu-token";

        var hash1 = PasswordResetService.CalcularHash(bruto);
        var hash2 = PasswordResetService.CalcularHash(bruto);

        hash1.Should().Be(hash2);
        hash1.Should().NotBe(bruto);
        hash1.Should().HaveLength(64);
    }

    [Fact]
    public void MontarEmailHtml_ContemNomeLinkEValidade()
    {
        var html = PasswordResetService.MontarEmailHtml("Fulano", "http://localhost:5173/redefinir-senha?token=abc", 60);

        html.Should().Contain("Fulano");
        html.Should().Contain("http://localhost:5173/redefinir-senha?token=abc");
        html.Should().Contain("60 minutos");
    }
}
