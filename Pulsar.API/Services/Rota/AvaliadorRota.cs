using Pulsar.API.Domain.Enums;
using Pulsar.API.Domain.Score;

namespace Pulsar.API.Services.Rota;

public enum EstadoRota { PodeIr, ComAtencao, Esperar, SemDado }

/// <param name="Proximas">Horas cheias futuras em ordem (UTC). Vazia = sem previsão.</param>
public record TrechoEntrada(Guid SubprefeituraId, string Nome, FaixaRisco? FaixaAgora, bool AlagandoCge,
    IReadOnlyList<HoraPrevista> Proximas);

public record HoraPrevista(DateTime InicioUtc, FaixaRisco Faixa);

public record HoraRota(DateTime InicioUtc, FaixaRisco PiorFaixa);

public record ResultadoRota(EstadoRota Estado, Guid? TrechoDecisivoId, DateTime? EsperarAteUtc, IReadOnlyList<HoraRota> Horas);

/// <summary>
/// Veredito de um caminho (lista de subprefeituras em ordem). Quem decide é a chuva medida agora
/// (decisão de 16/11/2026): a previsão por hora só entra para estimar até quando esperar, quando
/// a medida já mandou esperar. Puro: sem banco, sem relógio, sem rede.
/// </summary>
public static class AvaliadorRota
{
    public static ResultadoRota Avaliar(IReadOnlyList<TrechoEntrada> trechos, DateTime agoraUtc)
    {
        var horaAtual = new DateTime(agoraUtc.Year, agoraUtc.Month, agoraUtc.Day, agoraUtc.Hour, 0, 0, DateTimeKind.Utc);

        // Pior faixa prevista por hora cheia, só nas horas que TODOS os trechos preveem: hora sem
        // previsão num trecho não é hora tranquila, então não pode liberar a espera.
        var futuras = trechos.SelectMany(t => t.Proximas)
            .GroupBy(h => h.InicioUtc)
            .OrderBy(g => g.Key)
            .Where(g => trechos.All(t => t.Proximas.Any(h => h.InicioUtc == g.Key)))
            .Select(g => new HoraRota(g.Key, g.Max(h => h.Faixa)))
            .ToList();

        var critico = trechos.FirstOrDefault(t => t.FaixaAgora == FaixaRisco.ALTO || t.AlagandoCge);
        if (critico is not null)
        {
            var temCge = trechos.Any(t => t.AlagandoCge);
            var limite = horaAtual.AddHours(LimiaresRota.HorizonteEsperaHoras);
            DateTime? ate = futuras
                .Where(h => h.InicioUtc <= limite && h.PiorFaixa <= FaixaRisco.MODERADO
                    && (!temCge || h.InicioUtc >= agoraUtc.AddHours(1)))
                .Select(h => (DateTime?)h.InicioUtc).FirstOrDefault();
            return new(EstadoRota.Esperar, critico.SubprefeituraId, ate, Faixa(trechos, horaAtual, futuras));
        }

        // Sem dado nunca vira "pode ir": o silêncio não é sinal de tranquilidade.
        var semDado = trechos.FirstOrDefault(t => t.FaixaAgora is null);
        if (semDado is not null)
            return new(EstadoRota.SemDado, semDado.SubprefeituraId, null, []);

        // Atenção medida agora em algum trecho. Chuva só prevista não muda o veredito.
        var moderadoAgora = trechos.FirstOrDefault(t => t.FaixaAgora == FaixaRisco.MODERADO);
        if (moderadoAgora is not null)
            return new(EstadoRota.ComAtencao, moderadoAgora.SubprefeituraId, null, []);

        return new(EstadoRota.PodeIr, null, null, []);
    }

    /// <summary>Hora atual (pior faixa de agora) mais as próximas, até HorasNaFaixa. Vazia sem previsão.</summary>
    private static IReadOnlyList<HoraRota> Faixa(IReadOnlyList<TrechoEntrada> trechos, DateTime horaAtual, List<HoraRota> futuras)
    {
        if (futuras.Count == 0) return [];
        // CGE alagando pesa como ALTO: a célula "agora" não pode ficar verde num veredito de esperar.
        var agora = trechos.Any(t => t.AlagandoCge)
            ? FaixaRisco.ALTO
            : trechos.Where(t => t.FaixaAgora is not null).Select(t => t.FaixaAgora!.Value)
                .DefaultIfEmpty(FaixaRisco.BAIXO).Max();
        return [new HoraRota(horaAtual, agora), .. futuras.Take(LimiaresRota.HorasNaFaixa - 1)];
    }

    /// <summary>
    /// Faixa de alagamento prevista para uma hora. Só alagamento: vento e calor não têm
    /// previsão horária aqui. h3 = hora mais as duas anteriores (ausente = 0).
    /// </summary>
    public static FaixaRisco FaixaPrevista(IReadOnlyDictionary<DateTime, double> chuvaPorHora, DateTime horaUtc,
        double chuva48hMm, string nome)
    {
        double Chuva(int deslocamento) => chuvaPorHora.GetValueOrDefault(horaUtc.AddHours(-deslocamento));
        var h1 = Chuva(0);
        var h3 = h1 + Chuva(1) + Chuva(2);
        return CalculadoraScore.Calcular(new EntradaScore(h1, h3, chuva48hMm, 0, 0, nome)).Alagamento.Faixa;
    }
}
