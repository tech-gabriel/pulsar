using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Services;

/// <summary>C1: a própria pessoa exclui a conta confirmando com a palavra "excluir".</summary>
public class AuthServiceExcluirContaTests
{
    private readonly Mock<IUsuarioRepository> _usuarios = new();
    private readonly Mock<IEmailSender> _email = new();
    private readonly Usuario _ana = new() { Nome = "Ana", Email = "ana@x.com" };

    private AuthService Criar() => new(
        _usuarios.Object,
        new ConfigurationBuilder().Build(),
        new Mock<IEmailVerificacaoService>().Object,
        _email.Object,
        NullLogger<AuthService>.Instance);

    public AuthServiceExcluirContaTests()
    {
        _usuarios.Setup(r => r.ObterPorIdAsync(_ana.Id)).ReturnsAsync(_ana);
    }

    [Fact]
    public async Task Excluir_ConfirmacaoCerta_RemoveSalvaEDepoisEnviaEmail()
    {
        var ordem = new List<string>();
        _usuarios.Setup(r => r.RemoverAsync(_ana)).Callback(() => ordem.Add("remover")).Returns(Task.CompletedTask);
        _usuarios.Setup(r => r.SalvarAsync()).Callback(() => ordem.Add("salvar")).Returns(Task.CompletedTask);
        _email.Setup(e => e.EnviarAsync("ana@x.com", "Sua conta no Pulsar foi excluída", It.IsAny<string>(), default))
            .Callback(() => ordem.Add("email")).Returns(Task.CompletedTask);

        await Criar().ExcluirContaAsync(_ana.Id, " EXCLUIR ");

        ordem.Should().Equal("remover", "salvar", "email");
    }

    [Theory]
    [InlineData("excluir conta")]
    [InlineData("")]
    [InlineData(null)]
    public async Task Excluir_ConfirmacaoErrada_NaoRemove(string? confirmacao)
    {
        var acao = () => Criar().ExcluirContaAsync(_ana.Id, confirmacao!);

        await acao.Should().ThrowAsync<ArgumentException>();
        _usuarios.Verify(r => r.RemoverAsync(It.IsAny<Usuario>()), Times.Never);
    }

    [Fact]
    public async Task Excluir_Admin_Recusa()
    {
        _ana.Role = RoleAcesso.ADMIN;

        var acao = () => Criar().ExcluirContaAsync(_ana.Id, "excluir");

        await acao.Should().ThrowAsync<InvalidOperationException>();
        _usuarios.Verify(r => r.RemoverAsync(It.IsAny<Usuario>()), Times.Never);
    }

    [Fact]
    public async Task Excluir_EmailFalha_ExclusaoValeMesmoAssim()
    {
        _email.Setup(e => e.EnviarAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), default))
            .ThrowsAsync(new HttpRequestException("Resend fora"));

        await Criar().ExcluirContaAsync(_ana.Id, "excluir");

        _usuarios.Verify(r => r.SalvarAsync(), Times.Once);
    }

    [Fact]
    public async Task Excluir_ContaInexistente_Lanca()
    {
        var acao = () => Criar().ExcluirContaAsync(Guid.NewGuid(), "excluir");

        await acao.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public void EmailContaExcluida_EscapaONome()
    {
        AuthService.MontarEmailContaExcluida("<b>Ana</b>").Should().Contain("&lt;b&gt;Ana&lt;/b&gt;");
    }
}
