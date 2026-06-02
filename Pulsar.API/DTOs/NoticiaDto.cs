namespace Pulsar.API.DTOs;

/// <summary>Notícia climática/de emergência publicada por uma fonte externa.</summary>
public class NoticiaDto
{
    public string Titulo { get; set; } = string.Empty;
    public string Resumo { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
    public DateTime PublicadoEm { get; set; }
    public string Fonte { get; set; } = "CGE-SP";
}
