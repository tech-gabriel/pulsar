using FluentAssertions;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.Tests.Services;

public class ConsolidadorTests
{
    private static readonly TimeZoneInfo Sp = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    private static readonly DateTime Agora = new(2026, 10, 3, 15, 0, 0, DateTimeKind.Utc); // 12h em SP
    private static readonly Guid Mooca = Guid.NewGuid(), Penha = Guid.NewGuid(), Lapa = Guid.NewGuid();

    private static NotificacaoPendente P(Guid sub, string local, string gatilho = "score-alto",
        int prioridade = 1, CriterioOptIn criterio = CriterioOptIn.RiscoAlto, TimeSpan? cooldown = null,
        string? chave = null, string corpo = "Corpo")
        => new(gatilho, chave ?? $"{gatilho}:{sub}", criterio,
               new PushPayload($"Titulo {local}", corpo, "/", $"tag-{sub}"),
               prioridade, cooldown, sub, local);

    private static DestinatarioPush D(Guid[]? favoritas = null, CriterioOptIn[]? criterios = null,
        params EnvioAnterior[] recentes)
        => new(Guid.NewGuid(),
               (favoritas ?? [Mooca, Penha, Lapa]).ToHashSet(),
               (criterios ?? [CriterioOptIn.RiscoAlto, CriterioOptIn.RiscoModerado, CriterioOptIn.ResumoDiario]).ToHashSet(),
               recentes, Sp);

    [Fact]
    public void VariasSubprefeituras_ViramUmEnvioSo()
    {
        var envio = Consolidador.Consolidar(D(), [P(Mooca, "Mooca"), P(Penha, "Penha")], Agora);

        envio.Should().NotBeNull();
        envio!.Incluidas.Should().HaveCount(2);
        envio.Payload.Titulo.Should().Be("Risco alto em Mooca e Penha");
        envio.Payload.Tag.Should().Be("score-alto");
    }

    [Fact]
    public void UmaSubprefeitura_UsaOTextoDoProprioGatilho()
    {
        var envio = Consolidador.Consolidar(D(), [P(Mooca, "Mooca")], Agora);

        envio!.Payload.Titulo.Should().Be("Titulo Mooca");
    }

    [Fact]
    public void SubprefeituraQueNaoEFavorita_Ignorada()
    {
        Consolidador.Consolidar(D(favoritas: [Lapa]), [P(Mooca, "Mooca")], Agora).Should().BeNull();
    }

    [Fact]
    public void SemFavoritas_NaoRecebeNada()
    {
        Consolidador.Consolidar(D(favoritas: []), [P(Mooca, "Mooca")], Agora).Should().BeNull();
    }

    [Fact]
    public void CriterioSemAparelhoQueOptou_Filtrado()
    {
        var resumo = P(Mooca, "Mooca", "briefing-diario", 3, CriterioOptIn.ResumoDiario);

        Consolidador.Consolidar(D(criterios: [CriterioOptIn.RiscoAlto]), [resumo], Agora).Should().BeNull();
    }

    [Fact]
    public void RiscoAltoGanhaDeChuvaPrevista_ESoEntraOGrupoDoLider()
    {
        var envio = Consolidador.Consolidar(D(),
            [P(Mooca, "Mooca", "chuva-prevista", 2), P(Penha, "Penha", "score-alto", 1)], Agora);

        envio!.Incluidas.Should().ContainSingle().Which.Gatilho.Should().Be("score-alto");
    }

    [Fact]
    public void MesmoGatilhoComCriterioDiferente_FicaParaOProximoCiclo()
    {
        var forte = P(Mooca, "Mooca", "chuva-prevista", 2, CriterioOptIn.RiscoAlto);
        var moderada = P(Penha, "Penha", "chuva-prevista", 2, CriterioOptIn.RiscoModerado);

        var envio = Consolidador.Consolidar(D(), [moderada, forte], Agora);

        envio!.Criterio.Should().Be(CriterioOptIn.RiscoAlto);
        envio.Incluidas.Should().ContainSingle().Which.Local.Should().Be("Mooca");
    }

    [Fact]
    public void ChaveJaRecebida_NaoReenvia()
    {
        var p = P(Mooca, "Mooca", "chuva-prevista", 2, chave: "chuva:x");
        var d = D(null, null, new EnvioAnterior(Mooca, "chuva-prevista", "chuva:x", Guid.NewGuid(), Agora.AddHours(-1)));

        Consolidador.Consolidar(d, [p], Agora).Should().BeNull();
    }

    [Fact]
    public void CooldownAtivoNaMesmaSubprefeitura_NaoReenviaMesmoComChaveNova()
    {
        var p = P(Mooca, "Mooca", cooldown: TimeSpan.FromHours(1), chave: "score:nova");
        var d = D(null, null, new EnvioAnterior(Mooca, "score-alto", "score:velha", Guid.NewGuid(), Agora.AddMinutes(-30)));

        Consolidador.Consolidar(d, [p], Agora).Should().BeNull();
    }

    [Fact]
    public void CooldownDeOutraSubprefeitura_NaoBloqueia()
    {
        var p = P(Penha, "Penha", cooldown: TimeSpan.FromHours(1));
        var d = D(null, null, new EnvioAnterior(Mooca, "score-alto", "score:m", Guid.NewGuid(), Agora.AddMinutes(-30)));

        Consolidador.Consolidar(d, [p], Agora).Should().NotBeNull();
    }

    private static EnvioAnterior[] TresEnviosHoje()
        => [.. Enumerable.Range(1, 3).Select(i =>
            new EnvioAnterior(Lapa, "briefing-diario", $"b{i}", Guid.NewGuid(), Agora.AddHours(-i)))];

    [Fact]
    public void TetoDiarioDaPessoa_CortaOConteudoComum()
    {
        var chuva = P(Mooca, "Mooca", "chuva-prevista", 2);

        Consolidador.Consolidar(D(null, null, TresEnviosHoje()), [chuva], Agora).Should().BeNull();
    }

    [Fact]
    public void TetoDiarioEstourado_RiscoAltoPassaAssimMesmo()
    {
        Consolidador.Consolidar(D(null, null, TresEnviosHoje()), [P(Mooca, "Mooca")], Agora).Should().NotBeNull();
    }

    [Fact]
    public void TetoConta_EnvioIdDistinto_NaoLinhas()
    {
        // Um push consolidado com 3 subprefeituras grava 3 linhas, mas é UM envio.
        var envioId = Guid.NewGuid();
        var recentes = new[] { Mooca, Penha, Lapa }
            .Select(s => new EnvioAnterior(s, "chuva-prevista", $"c{s}", envioId, Agora.AddHours(-1))).ToArray();

        Consolidador.Consolidar(D(null, null, recentes), [P(Mooca, "Mooca", "briefing-diario", 3, CriterioOptIn.ResumoDiario)], Agora)
            .Should().NotBeNull();
    }

    [Fact]
    public void TetoIgnoraEnvioDeOutroDiaLocal()
    {
        var ontem = Enumerable.Range(1, 3)
            .Select(i => new EnvioAnterior(Lapa, "briefing-diario", $"b{i}", Guid.NewGuid(), Agora.AddHours(-20 - i))).ToArray();

        Consolidador.Consolidar(D(null, null, ontem), [P(Mooca, "Mooca", "chuva-prevista", 2)], Agora).Should().NotBeNull();
    }

    [Fact]
    public void Briefing_DeVarias_CitaAteDuasEMaisN()
    {
        var b = new[] { (Mooca, "Mooca"), (Penha, "Penha"), (Lapa, "Lapa") }
            .Select(x => P(x.Item1, x.Item2, "briefing-diario", 3, CriterioOptIn.ResumoDiario, corpo: "Risco baixo.")).ToList();

        var envio = Consolidador.Consolidar(D(), b, Agora);

        envio!.Payload.Titulo.Should().Be("Suas subprefeituras hoje");
        envio.Payload.Corpo.Should().Be("Mooca: Risco baixo. Penha: Risco baixo. E mais 1.");
    }

    [Fact]
    public void DezFavoritasEmRisco_TituloContinuaCurto()
    {
        var subs = Enumerable.Range(1, 10).Select(i => (Id: Guid.NewGuid(), Nome: $"Sub{i}")).ToList();
        var d = D(favoritas: [.. subs.Select(s => s.Id)]);

        var envio = Consolidador.Consolidar(d, [.. subs.Select(s => P(s.Id, s.Nome))], Agora);

        envio!.Payload.Titulo.Should().Be("Risco alto em Sub1, Sub2 e mais 8");
    }

    [Theory]
    [InlineData(new[] { "A" }, "A")]
    [InlineData(new[] { "A", "B" }, "A e B")]
    [InlineData(new[] { "A", "B", "C" }, "A, B e mais 1")]
    public void ListaNomes(string[] nomes, string esperado)
        => Consolidador.ListaNomes(nomes).Should().Be(esperado);
}
