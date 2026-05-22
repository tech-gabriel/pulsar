using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

public class AlertaServiceTests
{
    private readonly Mock<IScoreRepository> _scoreRepoMock = new();
    private readonly Mock<ISugestaoRepository> _sugestaoRepoMock = new();
    private readonly Mock<IAlertaRepository> _alertaRepoMock = new();
    private readonly Mock<ISubprefeituraRepository> _subprefeituraRepoMock = new();

    private AlertaService CriarAlertaService() => new(
        _scoreRepoMock.Object,
        _sugestaoRepoMock.Object,
        _alertaRepoMock.Object,
        _subprefeituraRepoMock.Object,
        NullLogger<AlertaService>.Instance);

    private static Subprefeitura NovaSubprefeitura(Guid regiaoId, bool ativa = true)
        => new() { RegiaoId = regiaoId, Nome = "Sub Teste", Ativa = ativa };

    private static ScorePerigo NovoScore(double valor, FaixaRisco faixa)
        => new() { Valor = valor, Faixa = faixa, Timestamp = DateTime.UtcNow };

    private static Sugestao NovaSugestao(string titulo = "Sugestão")
        => new() { Titulo = titulo, Descricao = "Desc", Categoria = "GERAL", FaixaRisco = FaixaRisco.ALTO, Ativa = true };

    // ──────────────────────────────────────────────
    // Casos sem alerta gerado
    // ──────────────────────────────────────────────

    [Fact]
    public async Task GerarAlertaAsync_SemSubprefeiturasNaRegiao_RetornaNulo()
    {
        var regiaoId = Guid.NewGuid();

        _subprefeituraRepoMock
            .Setup(r => r.ObterAtivasAsync())
            .ReturnsAsync(Enumerable.Empty<Subprefeitura>());

        var sut = CriarAlertaService();
        var resultado = await sut.GerarAlertaAsync(regiaoId);

        resultado.Should().BeNull();
    }

    [Fact]
    public async Task GerarAlertaAsync_TodosScoresBaixos_RetornaNulo()
    {
        var regiaoId = Guid.NewGuid();
        var sub = NovaSubprefeitura(regiaoId);

        _subprefeituraRepoMock
            .Setup(r => r.ObterAtivasAsync())
            .ReturnsAsync([sub]);

        _scoreRepoMock
            .Setup(r => r.ObterUltimoAsync(sub.Id))
            .ReturnsAsync(NovoScore(25, FaixaRisco.BAIXO));

        var sut = CriarAlertaService();
        var resultado = await sut.GerarAlertaAsync(regiaoId);

        resultado.Should().BeNull();
    }

    [Fact]
    public async Task GerarAlertaAsync_ScoresModerados_RetornaNulo()
    {
        var regiaoId = Guid.NewGuid();
        var sub = NovaSubprefeitura(regiaoId);

        _subprefeituraRepoMock
            .Setup(r => r.ObterAtivasAsync())
            .ReturnsAsync([sub]);

        _scoreRepoMock
            .Setup(r => r.ObterUltimoAsync(sub.Id))
            .ReturnsAsync(NovoScore(55, FaixaRisco.MODERADO));

        var sut = CriarAlertaService();
        var resultado = await sut.GerarAlertaAsync(regiaoId);

        resultado.Should().BeNull();
    }

    [Fact]
    public async Task GerarAlertaAsync_ScoreNulo_RetornaNulo()
    {
        var regiaoId = Guid.NewGuid();
        var sub = NovaSubprefeitura(regiaoId);

        _subprefeituraRepoMock
            .Setup(r => r.ObterAtivasAsync())
            .ReturnsAsync([sub]);

        _scoreRepoMock
            .Setup(r => r.ObterUltimoAsync(sub.Id))
            .ReturnsAsync((ScorePerigo?)null);

        var sut = CriarAlertaService();
        var resultado = await sut.GerarAlertaAsync(regiaoId);

        resultado.Should().BeNull();
    }

    // ──────────────────────────────────────────────
    // Casos com alerta gerado
    // ──────────────────────────────────────────────

    [Fact]
    public async Task GerarAlertaAsync_ScoreAlto_GeraAlertaComRegiaoCorreta()
    {
        var regiaoId = Guid.NewGuid();
        var sub = NovaSubprefeitura(regiaoId);
        var score = NovoScore(75, FaixaRisco.ALTO);

        _subprefeituraRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([sub]);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub.Id)).ReturnsAsync(score);
        _sugestaoRepoMock.Setup(r => r.ObterPorCategoriaEFaixaAsync("GERAL", FaixaRisco.ALTO))
            .ReturnsAsync([]);
        _alertaRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<Alerta>())).Returns(Task.CompletedTask);
        _alertaRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarAlertaService();
        var resultado = await sut.GerarAlertaAsync(regiaoId);

        resultado.Should().NotBeNull();
        resultado!.RegiaoId.Should().Be(regiaoId);
        resultado.ScoreId.Should().Be(score.Id);
    }

    [Fact]
    public async Task GerarAlertaAsync_ScoreAlto_MensagemContemScoreValor()
    {
        var regiaoId = Guid.NewGuid();
        var sub = NovaSubprefeitura(regiaoId);
        var score = NovoScore(82.5, FaixaRisco.ALTO);

        _subprefeituraRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([sub]);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub.Id)).ReturnsAsync(score);
        _sugestaoRepoMock.Setup(r => r.ObterPorCategoriaEFaixaAsync("GERAL", FaixaRisco.ALTO))
            .ReturnsAsync([]);
        _alertaRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<Alerta>())).Returns(Task.CompletedTask);
        _alertaRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarAlertaService();
        var resultado = await sut.GerarAlertaAsync(regiaoId);

        // Mensagem contém o score formatado (vírgula ou ponto dependendo da cultura)
        (resultado!.Mensagem.Contains("82,5") || resultado.Mensagem.Contains("82.5")).Should().BeTrue();
        resultado.Mensagem.Should().Contain("ALTO");
    }

    [Fact]
    public async Task GerarAlertaAsync_ScoreAlto_VinculaSugestoesDoRepositorio()
    {
        var regiaoId = Guid.NewGuid();
        var sub = NovaSubprefeitura(regiaoId);
        var score = NovoScore(78, FaixaRisco.ALTO);
        var sugestoes = new List<Sugestao>
        {
            NovaSugestao("Fuja dos alagamentos"),
            NovaSugestao("Ligue para Defesa Civil")
        };

        _subprefeituraRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([sub]);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub.Id)).ReturnsAsync(score);
        _sugestaoRepoMock.Setup(r => r.ObterPorCategoriaEFaixaAsync("GERAL", FaixaRisco.ALTO))
            .ReturnsAsync(sugestoes);
        _alertaRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<Alerta>())).Returns(Task.CompletedTask);
        _alertaRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarAlertaService();
        var resultado = await sut.GerarAlertaAsync(regiaoId);

        resultado!.AlertaSugestoes.Should().HaveCount(2);
        resultado.AlertaSugestoes[0].Ordem.Should().Be(1);
        resultado.AlertaSugestoes[1].Ordem.Should().Be(2);
    }

    [Fact]
    public async Task GerarAlertaAsync_MultiploScoresAltos_UsaScoreMaximo()
    {
        var regiaoId = Guid.NewGuid();

        var sub1 = NovaSubprefeitura(regiaoId);
        var sub2 = NovaSubprefeitura(regiaoId);
        var sub3 = NovaSubprefeitura(regiaoId);

        var score1 = NovoScore(70, FaixaRisco.ALTO);
        var score2 = NovoScore(95, FaixaRisco.ALTO); // ← máximo
        var score3 = NovoScore(62, FaixaRisco.ALTO);

        _subprefeituraRepoMock.Setup(r => r.ObterAtivasAsync())
            .ReturnsAsync([sub1, sub2, sub3]);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub1.Id)).ReturnsAsync(score1);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub2.Id)).ReturnsAsync(score2);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub3.Id)).ReturnsAsync(score3);
        _sugestaoRepoMock.Setup(r => r.ObterPorCategoriaEFaixaAsync("GERAL", FaixaRisco.ALTO))
            .ReturnsAsync([]);
        _alertaRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<Alerta>())).Returns(Task.CompletedTask);
        _alertaRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarAlertaService();
        var resultado = await sut.GerarAlertaAsync(regiaoId);

        resultado!.ScoreId.Should().Be(score2.Id);
        resultado.Mensagem.Should().Contain("95");
    }

    [Fact]
    public async Task GerarAlertaAsync_ScoreAlto_PersistirAlertaUmaVez()
    {
        var regiaoId = Guid.NewGuid();
        var sub = NovaSubprefeitura(regiaoId);
        var score = NovoScore(71, FaixaRisco.ALTO);

        _subprefeituraRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([sub]);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub.Id)).ReturnsAsync(score);
        _sugestaoRepoMock.Setup(r => r.ObterPorCategoriaEFaixaAsync("GERAL", FaixaRisco.ALTO))
            .ReturnsAsync([]);
        _alertaRepoMock.Setup(r => r.AdicionarAsync(It.IsAny<Alerta>())).Returns(Task.CompletedTask);
        _alertaRepoMock.Setup(r => r.SalvarAsync()).Returns(Task.CompletedTask);

        var sut = CriarAlertaService();
        await sut.GerarAlertaAsync(regiaoId);

        _alertaRepoMock.Verify(r => r.AdicionarAsync(It.IsAny<Alerta>()), Times.Once);
        _alertaRepoMock.Verify(r => r.SalvarAsync(), Times.Once);
    }

    [Fact]
    public async Task GerarAlertaAsync_SubprefeituraDeOutraRegiao_NaoGeraAlerta()
    {
        var regiaoAlvo = Guid.NewGuid();
        var outraRegiao = Guid.NewGuid();

        // Sub pertence a outra região
        var sub = NovaSubprefeitura(outraRegiao);
        var score = NovoScore(90, FaixaRisco.ALTO);

        _subprefeituraRepoMock.Setup(r => r.ObterAtivasAsync()).ReturnsAsync([sub]);
        _scoreRepoMock.Setup(r => r.ObterUltimoAsync(sub.Id)).ReturnsAsync(score);

        var sut = CriarAlertaService();
        var resultado = await sut.GerarAlertaAsync(regiaoAlvo);

        resultado.Should().BeNull();
    }
}
