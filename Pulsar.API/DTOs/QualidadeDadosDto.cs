namespace Pulsar.API.DTOs;

/// <summary>Painel de qualidade: a chuva do Pulsar bate com a realidade? Campos null = sem dado.</summary>
public class QualidadeDadosDto
{
    public int Dias { get; set; }

    /// <summary>False quando o Open-Meteo não respondeu: os avisos que dependem dele não foram calculados.</summary>
    public bool OpenMeteoDisponivel { get; set; }

    public IReadOnlyList<AvisoQualidadeDto> Avisos { get; set; } = [];
    public IReadOnlyList<QualidadeSubprefeituraDto> Subprefeituras { get; set; } = [];
}

public class AvisoQualidadeDto
{
    /// <summary>chuva-nao-aconteceu, chuva-passou-batida, alerta-sem-confirmacao ou coleta-falhando.</summary>
    public string Tipo { get; set; } = string.Empty;
    public string Subprefeitura { get; set; } = string.Empty;
    public DateOnly Dia { get; set; }
    public string Detalhe { get; set; } = string.Empty;
}

public class QualidadeSubprefeituraDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public double? ChuvaPulsarMm { get; set; }
    public double? ChuvaOpenMeteoMm { get; set; }
    public int? HorasBarradas { get; set; }
    public int? HorasIncompletas { get; set; }
    public int PontosCge { get; set; }

    /// <summary>Mais recente primeiro.</summary>
    public IReadOnlyList<QualidadeDiaDto> Dias { get; set; } = [];
}

public class QualidadeDiaDto
{
    public DateOnly Dia { get; set; }
    public double? ChuvaPulsarMm { get; set; }
    public double? ChuvaOpenMeteoMm { get; set; }
    public int? HorasBarradas { get; set; }
    public int? HorasIncompletas { get; set; }
    public int PontosCge { get; set; }
    public bool TeveAlerta { get; set; }
}
