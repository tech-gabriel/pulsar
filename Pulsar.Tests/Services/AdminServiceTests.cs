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
        string categoria = "alagamento", string titulo = "Título", string descricao = "Descrição",
        FaixaRisco faixa = FaixaRisco.MODERADO, bool ativa = true, int ordem = 1)
        => new() { Categoria = categoria, Titulo = titulo, Descricao = descricao, FaixaRisco = faixa, Ativa = ativa, Ordem = ordem };

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

        var dto = await sut.CriarSugestaoAsync(Req(categoria: " calor "));

        dto.Categoria.Should().Be("CALOR");
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

    [Theory]
    [InlineData("GERAL", FaixaRisco.MODERADO, 1)]
    [InlineData("NEBLINA", FaixaRisco.ALTO, 1)]
    [InlineData("ALAGAMENTO", FaixaRisco.BAIXO, 1)]
    [InlineData("CALOR", FaixaRisco.ALTO, 0)]
    public async Task CriarSugestaoAsync_ForaDoCatalogoPorPerigo_Lanca(string categoria, FaixaRisco faixa, int ordem)
    {
        var acao = () => CriarService().CriarSugestaoAsync(Req(categoria: categoria, faixa: faixa, ordem: ordem));

        await acao.Should().ThrowAsync<ArgumentException>();
    }
}
