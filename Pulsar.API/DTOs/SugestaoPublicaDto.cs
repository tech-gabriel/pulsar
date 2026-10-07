using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>Dica do catálogo como o app exibe: categoria = perigo, faixa = Atenção (MODERADO) ou Alerta (ALTO).</summary>
public class SugestaoPublicaDto
{
    public Guid Id { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public FaixaRisco Faixa { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public int Ordem { get; set; }
}
