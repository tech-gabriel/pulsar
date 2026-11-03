using FluentAssertions;
using Pulsar.API.Domain.Enums;
using Pulsar.API.Services.Rota;

namespace Pulsar.Tests.Services;

public class AvaliadorRotaTests
{
    private static readonly DateTime Agora = new(2026, 11, 3, 20, 40, 0, DateTimeKind.Utc);
    private static DateTime H(int hora) => new DateTime(2026, 11, 3, 0, 0, 0, DateTimeKind.Utc).AddHours(hora);
    private static HoraPrevista P(int hora, FaixaRisco f) => new(H(hora), f);

    private static readonly Guid Mooca = Guid.NewGuid();
    private static readonly Guid Se = Guid.NewGuid();

    private static TrechoEntrada T(Guid id, FaixaRisco? agora, bool cge = false, params HoraPrevista[] prox)
        => new(id, "x", agora, cge, prox);

    private static HoraPrevista[] Baixas(params int[] horas) => horas.Select(h => P(h, FaixaRisco.BAIXO)).ToArray();

    [Fact]
    public void TodosTranquilos_SemPrevisao_PodeIr_SemHorario()
    {
        var r = AvaliadorRota.Avaliar([T(Mooca, FaixaRisco.BAIXO), T(Se, FaixaRisco.BAIXO)], Agora);
        r.Estado.Should().Be(EstadoRota.PodeIr);
        r.TranquiloAteUtc.Should().BeNull();
        r.Horas.Should().BeEmpty();
    }

    [Fact]
    public void TodosTranquilos_PrevisaoBaixaAte22h_PodeIr_TranquiloAte22h()
    {
        var r = AvaliadorRota.Avaliar([T(Mooca, FaixaRisco.BAIXO, false, Baixas(21, 22))], Agora);
        r.Estado.Should().Be(EstadoRota.PodeIr);
        r.TranquiloAteUtc.Should().Be(H(22));
    }

    [Fact]
    public void UmTrechoModeradoAgora_ComAtencao_ComHoras()
    {
        var r = AvaliadorRota.Avaliar([
            T(Mooca, FaixaRisco.MODERADO, false, Baixas(21, 22, 23, 24)),
            T(Se, FaixaRisco.BAIXO, false, Baixas(21, 22, 23, 24))], Agora);
        r.Estado.Should().Be(EstadoRota.ComAtencao);
        r.Horas.Should().HaveCount(4);
        r.Horas[0].PiorFaixa.Should().Be(FaixaRisco.MODERADO);
        r.Horas[0].InicioUtc.Should().Be(H(20));
    }

    [Fact]
    public void ProximaHoraAlta_SemAlertaAgora_ComAtencao()
    {
        var r = AvaliadorRota.Avaliar([T(Mooca, FaixaRisco.BAIXO, false, P(21, FaixaRisco.ALTO), P(22, FaixaRisco.BAIXO))], Agora);
        r.Estado.Should().Be(EstadoRota.ComAtencao);
        r.TrechoDecisivoId.Should().Be(Mooca);
    }

    [Fact]
    public void AlertaNaMooca_MelhoraAs22h_Esperar_Ate22h()
    {
        var r = AvaliadorRota.Avaliar([
            T(Se, FaixaRisco.BAIXO, false, Baixas(21, 22)),
            T(Mooca, FaixaRisco.ALTO, false, P(21, FaixaRisco.ALTO), P(22, FaixaRisco.BAIXO))], Agora);
        r.Estado.Should().Be(EstadoRota.Esperar);
        r.TrechoDecisivoId.Should().Be(Mooca);
        r.EsperarAteUtc.Should().Be(H(22));
    }

    [Fact]
    public void AlagandoCge_PrevisaoBaixaJa_EsperaPeloMenosUmaHora()
    {
        var r = AvaliadorRota.Avaliar([T(Mooca, FaixaRisco.BAIXO, true, Baixas(21, 22))], Agora);
        r.Estado.Should().Be(EstadoRota.Esperar);
        r.EsperarAteUtc.Should().Be(H(22));
        r.Horas[0].PiorFaixa.Should().Be(FaixaRisco.ALTO);
    }

    [Fact]
    public void Alerta_SoUmTrechoTemPrevisao_NaoLiberaEspera()
    {
        var r = AvaliadorRota.Avaliar([
            T(Mooca, FaixaRisco.ALTO, false, Baixas(21, 22)),
            T(Se, FaixaRisco.BAIXO)], Agora);
        r.Estado.Should().Be(EstadoRota.Esperar);
        r.EsperarAteUtc.Should().BeNull();
        r.Horas.Should().BeEmpty();
    }

    [Fact]
    public void PodeIr_TranquiloAte_ParaNaPrimeiraHoraSemCobertura()
    {
        var r = AvaliadorRota.Avaliar([
            T(Mooca, FaixaRisco.BAIXO, false, Baixas(21, 22, 23)),
            T(Se, FaixaRisco.BAIXO, false, Baixas(21, 22))], Agora);
        r.Estado.Should().Be(EstadoRota.PodeIr);
        r.TranquiloAteUtc.Should().Be(H(22));
    }

    [Fact]
    public void Alerta_SemPrevisao_EsperarSemHorario()
    {
        var r = AvaliadorRota.Avaliar([T(Mooca, FaixaRisco.ALTO)], Agora);
        r.Estado.Should().Be(EstadoRota.Esperar);
        r.EsperarAteUtc.Should().BeNull();
        r.Horas.Should().BeEmpty();
    }

    [Fact]
    public void TrechoSemDado_NuncaPodeIr()
    {
        var r = AvaliadorRota.Avaliar([T(Mooca, FaixaRisco.BAIXO), T(Se, null)], Agora);
        r.Estado.Should().Be(EstadoRota.SemDado);
        r.TrechoDecisivoId.Should().Be(Se);
    }

    [Fact]
    public void SemDadoEAlerta_AlertaVence()
    {
        var r = AvaliadorRota.Avaliar([T(Mooca, null), T(Se, FaixaRisco.ALTO)], Agora);
        r.Estado.Should().Be(EstadoRota.Esperar);
        r.TrechoDecisivoId.Should().Be(Se);
    }

    [Fact]
    public void UmTrechoSo_FuncionaComoCaminho()
        => AvaliadorRota.Avaliar([T(Mooca, FaixaRisco.BAIXO)], Agora).Estado.Should().Be(EstadoRota.PodeIr);

    [Fact]
    public void FaixaPrevista_ChuvaForteNaHora_DaAlto()
        => AvaliadorRota.FaixaPrevista(new Dictionary<DateTime, double> { [H(21)] = 40 }, H(21), 0, "Mooca")
            .Should().Be(FaixaRisco.ALTO);

    [Fact]
    public void FaixaPrevista_SemChuva_DaBaixo()
        => AvaliadorRota.FaixaPrevista(new Dictionary<DateTime, double>(), H(21), 50, "Mooca")
            .Should().Be(FaixaRisco.BAIXO);
}
