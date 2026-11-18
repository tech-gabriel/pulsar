namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Alerta oficial da Defesa Civil (feed nacional da IDAP), guardado só quando atinge alguma
/// área do Pulsar. Ativo: início até agora, antes da validade e sem cancelamento. Fica 30 dias
/// depois da validade, para conferir a qualidade e calibrar.
/// </summary>
public class AlertaOficial
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>O identifier do CAP (ex.: "198620/2026"). Único: chave do upsert e do push.</summary>
    public string Identificador { get; set; } = string.Empty;
    public string Evento { get; set; } = string.Empty;
    /// <summary>severity do CAP: Extreme, Severe, Moderate, Minor ou Unknown.</summary>
    public string Gravidade { get; set; } = string.Empty;
    public string Urgencia { get; set; } = string.Empty;
    public DateTime InicioUtc { get; set; }
    public DateTime ExpiraUtc { get; set; }
    /// <summary>senderName do CAP, que diz quem emitiu (ex.: "Defesa Civil Estadual De São Paulo").</summary>
    public string Emissor { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    /// <summary>instruction do CAP: a orientação oficial ("Em caso de emergência, ligue 199 ou 193").</summary>
    public string Instrucao { get; set; } = string.Empty;
    public DateTime? CanceladoEmUtc { get; set; }
    public DateTime RecebidoEmUtc { get; set; }

    public List<AlertaOficialArea> Areas { get; set; } = [];

    public bool AtivoEm(DateTime agoraUtc) => CanceladoEmUtc is null && InicioUtc <= agoraUtc && agoraUtc < ExpiraUtc;
}

/// <summary>Uma área do Pulsar atingida por um alerta oficial.</summary>
public class AlertaOficialArea
{
    public Guid AlertaOficialId { get; set; }
    public AlertaOficial AlertaOficial { get; set; } = null!;
    public Guid SubprefeituraId { get; set; }
    public Subprefeitura Subprefeitura { get; set; } = null!;
}
