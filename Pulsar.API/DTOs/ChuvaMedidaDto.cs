using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.DTOs;

/// <summary>
/// Chuva medida por pluviômetro, como o app mostra ao lado do selo "medido". Null no lugar
/// deste objeto = a região só tem chuva estimada por modelo agora. O posto do CGE-SP fala na
/// frente (tem a janela de 15 minutos); a estação do CEMADEN só entra quando o CGE não tem dado.
/// </summary>
public class ChuvaMedidaDto
{
    /// <summary>"cge" ou "cemaden": quem mediu. A tela diz a fonte ao lado do número.</summary>
    public string Fonte { get; set; } = "cge";

    /// <summary>
    /// Chuva dos últimos 15 minutos, em mm. Null quando não dá para afirmar a janela, e sempre
    /// null quando a fonte é o CEMADEN (a menor janela dele é de 1 hora).
    /// </summary>
    public double? Mm15 { get; set; }

    /// <summary>Chuva da última hora, em mm. Null quando falta a leitura de uma hora atrás.</summary>
    public double? Mm60 { get; set; }

    /// <summary>Acumulado desde o zeramento diário do posto do CGE, em mm. Null quando a fonte é o CEMADEN.</summary>
    public double? AcumuladoPeriodoMm { get; set; }

    /// <summary>Nome do posto do CGE-SP ou da estação do CEMADEN.</summary>
    public string Posto { get; set; } = string.Empty;

    /// <summary>True quando o posto do CGE é de uma subprefeitura vizinha (a região não tem posto próprio com dado).</summary>
    public bool Vizinho { get; set; }

    /// <summary>
    /// Em UTC. No CGE é o horário da NOSSA coleta (a página não informa o da leitura); no
    /// CEMADEN é o instante da consulta lá. Nenhum dos dois é o horário em que choveu.
    /// </summary>
    public DateTime ColetadoEm { get; set; }

    public static ChuvaMedidaDto? De(ChuvaMedidaRegiao? cge, ChuvaCemadenRegiao? cemaden)
    {
        if (cge is not null)
            return new()
            {
                Fonte = "cge",
                Mm15 = cge.Mm15,
                Mm60 = cge.Mm60,
                AcumuladoPeriodoMm = cge.AcumuladoPeriodoMm,
                Posto = cge.NomePosto,
                Vizinho = cge.Vizinho,
                ColetadoEm = DateTime.SpecifyKind(cge.ColetadoEm, DateTimeKind.Utc),
            };

        // Sem a última hora não há "agora" para afirmar: a região fica só com a estimada.
        if (cemaden is not { Mm1h: { } mm1h, Estacao1h: { } estacao, DataHora1h: { } quando }) return null;
        return new()
        {
            Fonte = "cemaden",
            Mm60 = mm1h,
            Posto = estacao,
            ColetadoEm = DateTime.SpecifyKind(quando, DateTimeKind.Utc),
        };
    }
}

/// <summary>Chuva das últimas 24 horas numa estação do CEMADEN perto da região. O CGE-SP não publica esse número.</summary>
public class Chuva24hDto
{
    public double Mm { get; set; }

    /// <summary>Nome da estação do CEMADEN.</summary>
    public string Estacao { get; set; } = string.Empty;

    /// <summary>Instante da consulta no CEMADEN, em UTC.</summary>
    public DateTime MedidoEm { get; set; }

    public static Chuva24hDto? De(ChuvaCemadenRegiao? cemaden)
        => cemaden is { Mm24h: { } mm, Estacao24h: { } estacao, DataHora24h: { } quando }
            ? new() { Mm = mm, Estacao = estacao, MedidoEm = DateTime.SpecifyKind(quando, DateTimeKind.Utc) }
            : null;
}
