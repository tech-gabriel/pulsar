using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class AdminServiceTests
{
    private readonly Mock<IUsuarioRepository> _usuarioRepoMock = new();
    private readonly Mock<ISugestaoRepository> _sugestaoRepoMock = new();

    private AdminService CriarService() => new(_usuarioRepoMock.Object, _sugestaoRepoMock.Object);

    private static SalvarSugestaoRequestDto Req(
        string categoria = "geral", string titulo = "Título", string descricao = "Descrição",
        FaixaRisco faixa = FaixaRisco.BAIXO, bool ativa = true)
        => new() { Categoria = categoria, Titulo = titulo, Descricao = descricao, FaixaRisco = faixa, Ativa = ativa };

    // ── Anti-lockout (usuários) ────────────────────────────────

    [Fact]
    public async Task AlterarRoleAsync_AdminNaPropriaConta_LancaInvalidOperation()
    {
        var sut = CriarService();
        var id = Guid.NewGuid();

        var acao = () => sut.AlterarRoleAsync(id, id, RoleAcesso.USUARIO);

        await acao.Should().ThrowAsync<InvalidOperationException>();
    }

    // ── Exclusão de usuários ───────────────────────────────────

    [Fact]
    public async Task ExcluirUsuarioAsync_PropriaConta_LancaInvalidOperation()
    {
        var sut = CriarService();
        var id = Guid.NewGuid();

        var acao = () => sut.ExcluirUsuarioAsync(id, id);

        await acao.Should().ThrowAsync<InvalidOperationException>();
        _usuarioRepoMock.Verify(r => r.RemoverAsync(It.IsAny<Usuario>()), Times.Never);
    }

    [Fact]
    public async Task ExcluirUsuarioAsync_Inexistente_LancaKeyNotFound()
    {
        _usuarioRepoMock.Setup(r => r.ObterPorIdAsync(It.IsAny<Guid>())).ReturnsAsync((Usuario?)null);
        var sut = CriarService();

        var acao = () => sut.ExcluirUsuarioAsync(Guid.NewGuid(), Guid.NewGuid());

        await acao.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ExcluirUsuarioAsync_AlvoAdmin_LancaInvalidOperation()
    {
        var alvo = new Usuario { Id = Guid.NewGuid(), Email = "a@a.com", Role = RoleAcesso.ADMIN };
        _usuarioRepoMock.Setup(r => r.ObterPorIdAsync(alvo.Id)).ReturnsAsync(alvo);
        var sut = CriarService();

        var acao = () => sut.ExcluirUsuarioAsync(Guid.NewGuid(), alvo.Id);

        await acao.Should().ThrowAsync<InvalidOperationException>();
        _usuarioRepoMock.Verify(r => r.RemoverAsync(It.IsAny<Usuario>()), Times.Never);
    }

    [Fact]
    public async Task ExcluirUsuarioAsync_UsuarioComum_RemoveESalva()
    {
        var alvo = new Usuario { Id = Guid.NewGuid(), Email = "u@u.com", Role = RoleAcesso.USUARIO };
        _usuarioRepoMock.Setup(r => r.ObterPorIdAsync(alvo.Id)).ReturnsAsync(alvo);
        var sut = CriarService();

        await sut.ExcluirUsuarioAsync(Guid.NewGuid(), alvo.Id);

        _usuarioRepoMock.Verify(r => r.RemoverAsync(alvo), Times.Once);
        _usuarioRepoMock.Verify(r => r.SalvarAsync(), Times.Once);
    }

    // ── Sugestões: criação/validação ───────────────────────────

    [Fact]
    public async Task CriarSugestaoAsync_NormalizaCategoriaParaMaiuscula()
    {
        var sut = CriarService();

        var dto = await sut.CriarSugestaoAsync(Req(categoria: " geral "));

        dto.Categoria.Should().Be("GERAL");
        _sugestaoRepoMock.Verify(r => r.AdicionarAsync(It.IsAny<Sugestao>()), Times.Once);
        _sugestaoRepoMock.Verify(r => r.SalvarAsync(), Times.Once);
    }

    [Fact]
    public async Task CriarSugestaoAsync_TituloVazio_LancaArgumentException()
    {
        var sut = CriarService();

        var acao = () => sut.CriarSugestaoAsync(Req(titulo: "   "));

        await acao.Should().ThrowAsync<ArgumentException>();
    }

    // ── Sugestões: remoção ─────────────────────────────────────

    [Fact]
    public async Task RemoverSugestaoAsync_Inexistente_LancaKeyNotFound()
    {
        _sugestaoRepoMock.Setup(r => r.ObterPorIdAsync(It.IsAny<Guid>())).ReturnsAsync((Sugestao?)null);
        var sut = CriarService();

        var acao = () => sut.RemoverSugestaoAsync(Guid.NewGuid());

        await acao.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task RemoverSugestaoAsync_VinculadaAAlertas_LancaInvalidOperation()
    {
        // Simula a violação de FK (AlertaSugestao -> Sugestao é Restrict).
        _sugestaoRepoMock.Setup(r => r.ObterPorIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync(new Sugestao { Titulo = "T", Descricao = "D", Categoria = "GERAL" });
        _sugestaoRepoMock.Setup(r => r.SalvarAsync())
            .ThrowsAsync(new DbUpdateException("FK violation"));
        var sut = CriarService();

        var acao = () => sut.RemoverSugestaoAsync(Guid.NewGuid());

        await acao.Should().ThrowAsync<InvalidOperationException>();
    }
}
