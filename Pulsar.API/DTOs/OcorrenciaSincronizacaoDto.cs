namespace Pulsar.API.DTOs;

/// <summary>Resumo de uma sincronização de ocorrências com o GeoSampa.</summary>
public class OcorrenciaSincronizacaoDto
{
    public int Total { get; set; }
    public int Alagamentos { get; set; }
    public int Inundacoes { get; set; }
}
