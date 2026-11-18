using Pulsar.API.Domain.Entities;

namespace Pulsar.API.DTOs;

/// <summary>Alerta oficial da Defesa Civil valendo na área, como o app mostra. Datas em UTC.</summary>
public class AlertaOficialDto
{
    /// <summary>O identifier do CAP: chave estável na tela.</summary>
    public string Identificador { get; set; } = string.Empty;
    public string Evento { get; set; } = string.Empty;
    /// <summary>severity do CAP: Extreme, Severe, Moderate, Minor ou Unknown. O app traduz.</summary>
    public string Gravidade { get; set; } = string.Empty;
    /// <summary>Quem emitiu (senderName do CAP). Sempre aparece junto do alerta.</summary>
    public string Emissor { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    /// <summary>A orientação oficial do alerta, como veio. Pode vir vazia.</summary>
    public string Instrucao { get; set; } = string.Empty;
    public DateTime InicioUtc { get; set; }
    public DateTime ExpiraUtc { get; set; }

    public static AlertaOficialDto De(AlertaOficial a) => new()
    {
        Identificador = a.Identificador,
        Evento = a.Evento,
        Gravidade = a.Gravidade,
        Emissor = a.Emissor,
        Titulo = a.Titulo,
        Descricao = a.Descricao,
        Instrucao = a.Instrucao,
        InicioUtc = DateTime.SpecifyKind(a.InicioUtc, DateTimeKind.Utc),
        ExpiraUtc = DateTime.SpecifyKind(a.ExpiraUtc, DateTimeKind.Utc),
    };
}
