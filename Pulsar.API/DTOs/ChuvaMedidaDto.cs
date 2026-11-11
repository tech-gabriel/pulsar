using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.DTOs;

/// <summary>
/// Chuva medida por um posto do CGE-SP, como o app mostra ao lado do selo "medido". Null no
/// lugar deste objeto = a região só tem chuva estimada por modelo agora.
/// </summary>
public class ChuvaMedidaDto
{
    /// <summary>Chuva dos últimos 15 minutos, em mm. Null quando não dá para afirmar a janela.</summary>
    public double? Mm15 { get; set; }

    /// <summary>Chuva da última hora, em mm. Null quando falta a leitura de uma hora atrás.</summary>
    public double? Mm60 { get; set; }

    /// <summary>Acumulado desde o zeramento diário do posto, em mm.</summary>
    public double AcumuladoPeriodoMm { get; set; }

    /// <summary>Nome do posto do CGE-SP.</summary>
    public string Posto { get; set; } = string.Empty;

    /// <summary>True quando o posto é de uma subprefeitura vizinha (a região não tem posto próprio com dado).</summary>
    public bool Vizinho { get; set; }

    /// <summary>Horário da NOSSA coleta, em UTC. A página do CGE não informa o horário da leitura.</summary>
    public DateTime ColetadoEm { get; set; }

    public static ChuvaMedidaDto De(ChuvaMedidaRegiao m) => new()
    {
        Mm15 = m.Mm15,
        Mm60 = m.Mm60,
        AcumuladoPeriodoMm = m.AcumuladoPeriodoMm,
        Posto = m.NomePosto,
        Vizinho = m.Vizinho,
        ColetadoEm = DateTime.SpecifyKind(m.ColetadoEm, DateTimeKind.Utc),
    };
}
