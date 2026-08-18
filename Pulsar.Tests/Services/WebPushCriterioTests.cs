using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class WebPushCriterioTests
{
    private static AssinaturaPush Assinatura(bool alto, bool moderado, bool resumo)
        => new() { AlertaAlto = alto, AlertaModerado = moderado, ResumoDiario = resumo };

    [Fact]
    public void RiscoAlto_SoPassaComAlertaAlto()
    {
        WebPushNotificationService
            .OptouPeloCriterio(Assinatura(alto: true, moderado: false, resumo: false), CriterioOptIn.RiscoAlto)
            .Should().BeTrue();

        WebPushNotificationService
            .OptouPeloCriterio(Assinatura(alto: false, moderado: true, resumo: true), CriterioOptIn.RiscoAlto)
            .Should().BeFalse();
    }

    [Fact]
    public void RiscoModerado_SoPassaComAlertaModerado()
    {
        WebPushNotificationService
            .OptouPeloCriterio(Assinatura(alto: false, moderado: true, resumo: false), CriterioOptIn.RiscoModerado)
            .Should().BeTrue();

        WebPushNotificationService
            .OptouPeloCriterio(Assinatura(alto: true, moderado: false, resumo: true), CriterioOptIn.RiscoModerado)
            .Should().BeFalse();
    }

    [Fact]
    public void ResumoDiario_SoPassaComResumoDiario()
    {
        WebPushNotificationService
            .OptouPeloCriterio(Assinatura(alto: false, moderado: false, resumo: true), CriterioOptIn.ResumoDiario)
            .Should().BeTrue();

        // O caso que motivou a mudança: quem só marcou risco alto NÃO recebe briefing.
        WebPushNotificationService
            .OptouPeloCriterio(Assinatura(alto: true, moderado: true, resumo: false), CriterioOptIn.ResumoDiario)
            .Should().BeFalse();
    }

    [Fact]
    public void CriterioSemMapeamento_Estoura()
    {
        // Critério sem braço no switch precisa falhar alto. Devolver false faria o envio
        // sumir em silêncio, que é o defeito que esta função existe para eliminar.
        var acao = () => WebPushNotificationService
            .OptouPeloCriterio(Assinatura(alto: true, moderado: true, resumo: true), (CriterioOptIn)999);

        acao.Should().Throw<ArgumentOutOfRangeException>()
            .And.ParamName.Should().Be("criterio");
    }
}
