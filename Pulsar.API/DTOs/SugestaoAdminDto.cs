using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>Sugestão completa para a área administrativa (inclui inativas).</summary>
public class SugestaoAdminDto
{
    public Guid Id { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public FaixaRisco FaixaRisco { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public bool Ativa { get; set; }
    public DateTime CriadoEm { get; set; }
    public DateTime AtualizadoEm { get; set; }
}
