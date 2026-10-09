using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Services.Notificacoes;

namespace Pulsar.API.Services;

/// <summary>
/// Estatísticas das páginas públicas de SEO a partir do rollup diário. Puro: quem chama
/// busca as linhas e resolve "hoje" no fuso local. Chaves = slug da página.
/// </summary>
public static class EstatisticasRegioes
{
    public const int JanelaDias = 90;

    /// <summary>Dia completo tem ~96 leituras (ciclo de 15 min); abaixo disso a coleta falhou.</summary>
    private const int LeiturasDiaCompleto = 80;

    public static EstatisticasRegioesDto Calcular(
        IEnumerable<Subprefeitura> subsAtivas, IEnumerable<AgregadoDiario> linhas, DateOnly hoje)
    {
        var inicio = hoje.AddDays(-(JanelaDias - 1));
        var subs = subsAtivas.ToList();
        var naJanela = linhas.Where(l => l.Dia >= inicio && l.Dia <= hoje).ToList();
        var porSub = naJanela.ToLookup(l => l.SubprefeituraId);

        var resultado = new EstatisticasRegioesDto { JanelaDias = JanelaDias, GeradoEm = hoje };

        foreach (var sub in subs)
        {
            var doSub = porSub[sub.Id].ToList();
            resultado.Subprefeituras[NomesSubprefeitura.Slug(sub.Nome)] = doSub.Count == 0 ? null : new EstatisticaRegiaoDto
            {
                DiasCompletos = Completos(doSub),
                DiasAlerta = doSub.Count(l => l.LeiturasAlto > 0),
                ChuvaTotalMm = Math.Round(doSub.Sum(l => l.ChuvaTotalMm), 1),
                FaixaPredominante = Predominante(doSub),
                DiaMaisChuvoso = MaisChuvoso(doSub),
            };
        }

        foreach (var zona in subs.GroupBy(s => s.Regiao.Nome))
        {
            var chave = "zona-" + NomesSubprefeitura.Slug(zona.Key);
            var daZona = zona.SelectMany(s => porSub[s.Id]).ToList();
            resultado.Zonas[chave] = daZona.Count == 0 ? null : new EstatisticaRegiaoDto
            {
                // O mínimo entre as subs: a zona só acende quando todas têm série completa.
                DiasCompletos = zona.Min(s => Completos(porSub[s.Id])),
                // Dias em que ALGUMA subprefeitura da zona esteve em Alerta (não é soma).
                DiasAlerta = daZona.Where(l => l.LeiturasAlto > 0).Select(l => l.Dia).Distinct().Count(),
                // Média, não soma: somar as subs daria um total que não descreve lugar nenhum.
                ChuvaTotalMm = Math.Round(zona.Average(s => porSub[s.Id].Sum(l => l.ChuvaTotalMm)), 1),
                FaixaPredominante = Predominante(daZona),
                DiaMaisChuvoso = MaisChuvoso(daZona),
            };
        }

        return resultado;
    }

    private static int Completos(IEnumerable<AgregadoDiario> linhas)
        => linhas.Count(l => l.LeiturasCount >= LeiturasDiaCompleto);

    private static FaixaRisco Predominante(IReadOnlyCollection<AgregadoDiario> linhas)
    {
        var baixo = linhas.Sum(l => l.LeiturasBaixo);
        var moderado = linhas.Sum(l => l.LeiturasModerado);
        var alto = linhas.Sum(l => l.LeiturasAlto);
        if (baixo + moderado + alto == 0) return FaixaRisco.BAIXO;
        // Empate vence a mais grave: num app de alerta, errar para o lado da cautela.
        if (alto >= moderado && alto >= baixo) return FaixaRisco.ALTO;
        return moderado >= baixo ? FaixaRisco.MODERADO : FaixaRisco.BAIXO;
    }

    private static DiaChuvosoDto? MaisChuvoso(IEnumerable<AgregadoDiario> linhas)
    {
        var topo = linhas.Where(l => l.ChuvaTotalMm > 0)
            .OrderByDescending(l => l.ChuvaTotalMm).ThenByDescending(l => l.Dia)
            .FirstOrDefault();
        return topo is null ? null : new DiaChuvosoDto { Dia = topo.Dia, Mm = Math.Round(topo.ChuvaTotalMm, 1) };
    }
}
