namespace Pulsar.API.DTOs;

/// <summary>Última leitura de uma subprefeitura (para visão de saúde da coleta).</summary>
public class SubprefeituraStatusDto
{
    public string Nome { get; set; } = string.Empty;
    public DateTime? UltimaLeitura { get; set; }
}

/// <summary>Status da coleta de dados climáticos.</summary>
public class SistemaStatusDto
{
    public int SubprefeiturasAtivas { get; set; }
    public int SubprefeiturasComLeitura { get; set; }
    public DateTime? UltimaColeta { get; set; }
    public int LeiturasUltimas24h { get; set; }
    public int IntervaloColetaMinutos { get; set; }
    public IReadOnlyList<SubprefeituraStatusDto> Subprefeituras { get; set; } = [];
}
