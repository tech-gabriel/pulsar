namespace Pulsar.API.DTOs;

/// <summary>Painel de qualidade: a chuva do Pulsar bate com a realidade? Campos null = sem dado.</summary>
public class QualidadeDadosDto
{
    public int Dias { get; set; }

    /// <summary>False quando o Open-Meteo não respondeu: os avisos que dependem dele não foram calculados.</summary>
    public bool OpenMeteoDisponivel { get; set; }

    public IReadOnlyList<AvisoQualidadeDto> Avisos { get; set; } = [];
    public IReadOnlyList<QualidadeSubprefeituraDto> Subprefeituras { get; set; } = [];

    /// <summary>Estado do sync do GeoSampa. Campos null = nenhuma execução gravada ainda.</summary>
    public SincronizacaoFonteDto GeoSampa { get; set; } = new();
}

public class SincronizacaoFonteDto
{
    public DateTime? UltimaTentativa { get; set; }
    public bool? UltimaTentativaSucesso { get; set; }
    public string? UltimoErro { get; set; }
    public DateTime? UltimoSucesso { get; set; }
    public int? NovasNoUltimoSucesso { get; set; }
}

public class AvisoQualidadeDto
{
    /// <summary>chuva-nao-aconteceu, chuva-passou-batida, alerta-sem-confirmacao, coleta-falhando ou geosampa-parado.</summary>
    public string Tipo { get; set; } = string.Empty;
    /// <summary>Vazio nos avisos da cidade inteira (geosampa-parado).</summary>
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
