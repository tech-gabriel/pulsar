using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>Valor/Faixa = principal (o pior perigo). Campos novos são aditivos.</summary>
public class ScoreDto
{
    public double Valor { get; set; }
    public FaixaRisco Faixa { get; set; }
    public DateTime Timestamp { get; set; }
    public TipoPerigo PerigoPrincipal { get; set; }
    public ComponentesScoreDto Componentes { get; set; } = new();
    public double Chuva3hMm { get; set; }
    public double Chuva48hMm { get; set; }
    /// <summary>Chuva de 3 h medida pelas estações que fizeram o alagamento. Null = o número veio do modelo.</summary>
    public double? Chuva3hMedidaMm { get; set; }
    /// <summary>Posto do CGE que mediu essa chuva; null = estações do CEMADEN nos trechos.</summary>
    public string? PostoChuvaMedida { get; set; }

    public static ScoreDto De(ScorePerigo s) => new()
    {
        Valor = Math.Round(s.Valor, 1),
        Faixa = s.Faixa,
        Timestamp = s.Timestamp,
        PerigoPrincipal = s.PerigoPrincipal,
        Componentes = new ComponentesScoreDto
        {
            Alagamento = new() { Valor = Math.Round(s.ValorAlagamento, 1), Faixa = s.FaixaAlagamento },
            Vento = new() { Valor = Math.Round(s.ValorVento, 1), Faixa = s.FaixaVento },
            Calor = new() { Valor = Math.Round(s.ValorCalor, 1), Faixa = s.FaixaCalor },
        },
        Chuva3hMm = Math.Round(s.Chuva3hMm, 1),
        Chuva48hMm = Math.Round(s.Chuva48hMm, 1),
        Chuva3hMedidaMm = s.Chuva3hMedidaMm is { } mm ? Math.Round(mm, 1) : null,
        PostoChuvaMedida = s.Chuva3hMedidaMm is null ? null : s.PostoChuvaMedida,
    };
}
