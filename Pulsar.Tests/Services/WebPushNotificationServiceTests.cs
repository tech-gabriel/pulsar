using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class WebPushNotificationServiceTests
{
    private readonly Mock<IAssinaturaPushRepository> _repoMock = new();

    // Chave pública VAPID válida (Base64 URL-safe, 65 bytes) só para habilitar o serviço nos testes.
    private const string PublicKeyExemplo =
        "BNbxGYNMhEIi9zKDBuQ0mNyQ1aGQzZpfQ8jD6r3rXanQ3X1jR8aJp8m2pVU8E0nDxh3xVc2t3Yk0mP3wKxqJ8A";
    private const string PrivateKeyExemplo = "Q2hhdmVQcml2YWRhRXhlbXBsb1BhcmFUZXN0ZXMxMjM0NTY";

    private WebPushNotificationService Criar(PushOptions options) => new(
        _repoMock.Object,
        Options.Create(options),
        NullLogger<WebPushNotificationService>.Instance);

    [Fact]
    public void SemChaves_FicaDesabilitado()
    {
        var sut = Criar(new PushOptions());

        sut.Habilitado.Should().BeFalse();
        sut.ChavePublica.Should().BeNull();
    }

    [Fact]
    public void ComChaves_ExpoeChavePublica()
    {
        var sut = Criar(new PushOptions { PublicKey = PublicKeyExemplo, PrivateKey = PrivateKeyExemplo });

        sut.Habilitado.Should().BeTrue();
        sut.ChavePublica.Should().Be(PublicKeyExemplo);
    }

    [Fact]
    public async Task NotificarRegiaoAsync_Desabilitado_RetornaZeroSemConsultarRepo()
    {
        var sut = Criar(new PushOptions());

        var enviados = await sut.NotificarRegiaoAsync(
            Guid.NewGuid(), CriterioOptIn.RiscoAlto, new PushPayload("t", "c"));

        enviados.Should().Be(0);
        _repoMock.Verify(r => r.ObterPorRegiaoFavoritaAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task NotificarRegiaoAsync_AssinaturasNaoOptaramPeloCriterio_NaoEnvia()
    {
        var regiaoId = Guid.NewGuid();
        // Inscrição só quer risco alto; chega um envio de risco moderado → não deve enviar.
        _repoMock.Setup(r => r.ObterPorRegiaoFavoritaAsync(regiaoId))
            .ReturnsAsync([new AssinaturaPush { AlertaAlto = true, AlertaModerado = false }]);

        var sut = Criar(new PushOptions { PublicKey = PublicKeyExemplo, PrivateKey = PrivateKeyExemplo });

        var enviados = await sut.NotificarRegiaoAsync(
            regiaoId, CriterioOptIn.RiscoModerado, new PushPayload("t", "c"));

        enviados.Should().Be(0);
    }
}
