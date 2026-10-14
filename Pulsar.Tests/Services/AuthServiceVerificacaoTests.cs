using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.Tests.Services;

/// <summary>Regras do SEC1 dentro do AuthService (Google e cadastro), sem chamar o Google de verdade.</summary>
public class AuthServiceVerificacaoTests
{
    private readonly Mock<IUsuarioRepository> _usuarios = new();
    private readonly Mock<IEmailVerificacaoService> _verificacao = new();

    private AuthService Criar() => new(
        _usuarios.Object,
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:SecretKey"] = "chave-de-teste-com-mais-de-32-caracteres-ok",
            ["Admin:Emails:0"] = "admin@x.com",
        }).Build(),
        _verificacao.Object,
        NullLogger<AuthService>.Instance);

    [Fact]
    public async Task Google_ContaNova_NasceVerificada()
    {
        Usuario? criado = null;
        _usuarios.Setup(r => r.AdicionarAsync(It.IsAny<Usuario>())).Callback<Usuario>(u => criado = u).Returns(Task.CompletedTask);

        var resp = await Criar().EntrarComEmailGoogleAsync("Nova@X.com", "Nova");

        criado!.EmailVerificado.Should().BeTrue();
        criado.Email.Should().Be("nova@x.com");
        resp.NovoUsuario.Should().BeTrue();
    }

    [Fact]
    public async Task Google_ContaNaoVerificada_EhAssumida()
    {
        var conta = new Usuario { Nome = "Atacante", Email = "vitima@x.com", SenhaHash = BCrypt.Net.BCrypt.HashPassword("senhaDoAtacante1!"), EmailPendente = "outro@x.com" };
        _usuarios.Setup(r => r.ObterPorEmailAsync("vitima@x.com")).ReturnsAsync(conta);

        await Criar().EntrarComEmailGoogleAsync("vitima@x.com", "Vítima");

        conta.EmailVerificado.Should().BeTrue();
        BCrypt.Net.BCrypt.Verify("senhaDoAtacante1!", conta.SenhaHash).Should().BeFalse();
        conta.EmailPendente.Should().BeNull();
        _usuarios.Verify(r => r.SalvarAsync(), Times.Once);
    }

    [Fact]
    public async Task Google_ContaVerificada_NaoMexeNaSenha()
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("minhaSenha12!");
        var conta = new Usuario { Nome = "Ana", Email = "ana@x.com", SenhaHash = hash, EmailVerificado = true };
        _usuarios.Setup(r => r.ObterPorEmailAsync("ana@x.com")).ReturnsAsync(conta);

        await Criar().EntrarComEmailGoogleAsync("ana@x.com", "Ana");

        conta.SenhaHash.Should().Be(hash);
    }

    [Fact]
    public async Task Cadastro_FalhaNoEnvioDoEmail_NaoDerrubaOCadastro()
    {
        _verificacao.Setup(v => v.EnviarConfirmacaoAsync(It.IsAny<Usuario>(), It.IsAny<string>()))
            .ThrowsAsync(new HttpRequestException("Resend fora do ar"));

        var resp = await Criar().CadastrarAsync(new CadastroRequestDto { Nome = "Ana", Email = "ana@x.com", Senha = "Senha#2026xx" });

        resp.Token.Should().NotBeNullOrWhiteSpace();
        resp.Usuario.EmailVerificado.Should().BeFalse();
        _usuarios.Verify(r => r.SalvarAsync(), Times.Once);
    }

    [Fact]
    public async Task Google_ContaNaoVerificadaComEmailAdmin_ViraAdmin()
    {
        var conta = new Usuario { Nome = "Admin", Email = "admin@x.com", SenhaHash = "h" };
        _usuarios.Setup(r => r.ObterPorEmailAsync("admin@x.com")).ReturnsAsync(conta);

        await Criar().EntrarComEmailGoogleAsync("admin@x.com", "Admin");

        conta.Role.Should().Be(RoleAcesso.ADMIN);
    }
}
