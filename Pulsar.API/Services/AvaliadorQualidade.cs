using System.Globalization;

namespace Pulsar.API.Services;

/// <summary>
/// Um dia de uma subprefeitura, do jeito que o painel de qualidade compara. Null = sem dado.
/// PontosCgeCidade conta a cidade inteira: é o que diz se houve tempestade de verdade.
/// </summary>
public record DiaQualidade(
    DateOnly Dia,
    double? ChuvaPulsarMm,
    double? ChuvaOpenMeteoMm,
    int? HorasBarradas,
    int? HorasIncompletas,
    int PontosCge,
    bool TeveAlerta,
    int? PontosCgeCidade = null);

public record AvisoQualidade(string Tipo, string Detalhe);

/// <summary>
/// Regra dos avisos do painel de qualidade, pura como o Consolidador. Existe para que a
/// próxima chuva falsa do OWM apareça no dia seguinte, e não dois meses depois como a de
/// setembro de 2026. Os números são ponto de partida: ajustar aqui quando houver dado real.
/// </summary>
public static class AvaliadorQualidade
{
    public const string ChuvaNaoAconteceu = "chuva-nao-aconteceu";
    public const string ChuvaPassouBatida = "chuva-passou-batida";
    public const string AlertaSemConfirmacao = "alerta-sem-confirmacao";
    public const string ColetaFalhando = "coleta-falhando";

    /// <summary>Abaixo disso a diferença entre as fontes é ruído de chuvisco.</summary>
    public const double ChuvaRelevanteMm = 20;
    /// <summary>Quantas vezes uma fonte precisa passar a outra para contar como divergência.</summary>
    public const double FatorDivergencia = 4;
    /// <summary>Com menos que isso no Open-Meteo, um Alerta de alagamento é suspeito.</summary>
    public const double ChuvaPoucaMm = 10;
    public const int MaxHorasIncompletas = 4;

    /// <summary>
    /// Menos leituras que isso na hora = faltou ciclo. Não é 4: o ciclo de 15 min escorrega
    /// e uma hora normal tem 3, 4 ou 5 leituras (visto em produção em 26/10/2026).
    /// </summary>
    public const int MinLeiturasHora = 3;

    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public static IReadOnlyList<AvisoQualidade> Avaliar(DiaQualidade d)
    {
        var avisos = new List<AvisoQualidade>();
        var comparacao = $"Pulsar {Mm(d.ChuvaPulsarMm)}, Open-Meteo {Mm(d.ChuvaOpenMeteoMm)}";

        // Os três primeiros dependem do Open-Meteo: sem ele, ficam de fora em vez de chutar.
        // O Open-Meteo é modelo, não pluviômetro, e subestima temporal: em 24/10/2026 marcou
        // 5 a 9 mm num dia com 7 alagamentos no CGE. Por isso "não aconteceu" e "sem
        // confirmação" exigem também a cidade sem nenhum alagamento, como em 07/09 e 18/10.
        var cidadeSemAlagamento = d.PontosCgeCidade == 0;
        if (d is { ChuvaPulsarMm: { } owm, ChuvaOpenMeteoMm: { } om })
        {
            if (cidadeSemAlagamento && owm >= ChuvaRelevanteMm && owm > FatorDivergencia * om)
                avisos.Add(new(ChuvaNaoAconteceu, comparacao));
            if (om >= ChuvaRelevanteMm && owm < om / FatorDivergencia)
                avisos.Add(new(ChuvaPassouBatida, comparacao));
        }

        if (cidadeSemAlagamento && d is { TeveAlerta: true, ChuvaOpenMeteoMm: < ChuvaPoucaMm })
            avisos.Add(new(AlertaSemConfirmacao, $"Alerta de alagamento sem nenhum ponto do CGE na cidade, Open-Meteo {Mm(d.ChuvaOpenMeteoMm)}"));

        if (d.HorasIncompletas > MaxHorasIncompletas)
            avisos.Add(new(ColetaFalhando, $"{d.HorasIncompletas} horas com ciclo de coleta faltando"));

        return avisos;
    }

    private static string Mm(double? valor) => valor is { } v ? $"{v.ToString("0.0", PtBr)} mm" : "sem dado";
}
