using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>Corpo de criação (POST) e edição (PUT) de uma sugestão no catálogo.</summary>
public class SalvarSugestaoRequestDto
{
    public string Categoria { get; set; } = string.Empty;
    public FaixaRisco FaixaRisco { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public bool Ativa { get; set; } = true;
}
