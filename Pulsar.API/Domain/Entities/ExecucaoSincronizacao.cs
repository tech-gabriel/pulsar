namespace Pulsar.API.Domain.Entities;

/// <summary>
/// Uma rodada de sincronização com uma fonte externa (hoje só o GeoSampa). Existe porque a
/// falha só ia para o log: em 26/10/2026 o GeoSampa estava 19 dias sem dado novo e não dava
/// para saber se o job falhava ou se a Prefeitura não tinha publicado. O painel de qualidade lê daqui.
/// </summary>
public class ExecucaoSincronizacao
{
    public const string FonteGeoSampa = "geosampa";

    public Guid Id { get; set; } = Guid.NewGuid();
    public string Fonte { get; set; } = string.Empty;
    public DateTime IniciadoEm { get; set; }
    public DateTime FinalizadoEm { get; set; }
    public bool Sucesso { get; set; }

    /// <summary>Ocorrências lidas na fonte e quantas não existiam no banco. Zero quando falhou.</summary>
    public int Lidas { get; set; }
    public int Novas { get; set; }

    public string? Erro { get; set; }

    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
