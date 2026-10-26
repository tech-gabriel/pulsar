using FluentAssertions;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class GatilhoAlagamentoCgeTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    private static ContextoGatilho Contexto(int pontos)
    {
        var sub = new Subprefeitura { Nome = "Pinheiros", Ativa = true };
        return new()
        {
            Estado = new EstadoSubprefeitura(sub, null, null),
            Fuso = Sp,
            Previsao = Array.Empty<FaixaPrevisaoDto>(),
            AgoraUtc = new DateTime(2026, 10, 25, 7, 0, 0, DateTimeKind.Utc),
            PontosCgeAtivos = [.. Enumerable.Range(0, pontos).Select(i => new PontoAlagamentoCge
            {
                SubprefeituraId = sub.Id, Via = $"TN DIRCE CAMARGO {i}", Ativo = true,
            })],
        };
    }

    [Fact]
    public async Task SemPontoAtivo_NaoAvisa()
    {
        (await new GatilhoAlagamentoCge().AvaliarAsync(Contexto(0))).Should().BeEmpty();
    }

    [Fact]
    public async Task PontoAtivo_AvisaComPrioridadeMaximaECooldownDeTresHoras()
    {
        var ctx = Contexto(1);

        var p = await new GatilhoAlagamentoCge().AvaliarAsync(ctx);

        p.Should().ContainSingle();
        // Literais e não as constantes: o 0 é o que põe o Perigo na frente do score alto (1)
        // e o isenta do teto diário, e as 3 h são a promessa de "1 aviso por nível a cada 3 h".
        p[0].Prioridade.Should().Be(0);
        p[0].Cooldown.Should().Be(TimeSpan.FromHours(3));
        p[0].Criterio.Should().Be(CriterioOptIn.RiscoAlto);
        p[0].Perigo.Should().Be(TipoPerigo.ALAGAMENTO);
        p[0].Gatilho.Should().Be("alagamento-cge");
        p[0].Chave.Should().Be($"cge:{ctx.Subprefeitura.Id}:202610250700");
        p[0].Payload.Titulo.Should().Be("Alagamento em Pinheiros agora");
        p[0].Payload.Corpo.Should().Be("O CGE registrou um ponto de alagamento. Evite a região se puder.");
        // Mesma tag do score alto: o Perigo substitui o Chuva forte na bandeja.
        p[0].Payload.Tag.Should().Be($"alerta-{ctx.Subprefeitura.Id}");
    }

    [Fact]
    public async Task VariosPontos_UmAvisoSoComAContagem()
    {
        var p = await new GatilhoAlagamentoCge().AvaliarAsync(Contexto(3));

        p.Should().ContainSingle();
        p[0].Payload.Corpo.Should().Be("O CGE registrou 3 pontos de alagamento. Evite a região se puder.");
        p[0].Payload.Corpo.Should().NotContain("—");
    }
}
