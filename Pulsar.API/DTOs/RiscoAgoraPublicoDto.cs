using Pulsar.API.Domain.Enums;

namespace Pulsar.API.DTOs;

/// <summary>
/// Risco atual de uma subprefeitura para a página pública "Pontos de alagamento em SP hoje".
/// Só o que é público: nenhum identificador interno, nenhum dado de usuário.
/// </summary>
public class RiscoAgoraPublicoDto
{
    public string Nome { get; set; } = string.Empty;
    public FaixaRisco FaixaRisco { get; set; }
    public double? Score { get; set; }
    /// <summary>Hora do score atual, em UTC (a página converte pelo fuso do navegador).</summary>
    public DateTime? AtualizadoEmUtc { get; set; }
    // O que a frase do risco usa (a mesma do detalhe do app): o perigo que puxa o risco e a leitura dele.
    public TipoPerigo? PerigoPrincipal { get; set; }
    public double? Chuva3hMm { get; set; }
    /// <summary>Chuva de 3 h medida pelas estações que fizeram o alagamento. Null = o número veio do modelo.</summary>
    public double? Chuva3hMedidaMm { get; set; }
    /// <summary>Posto do CGE que mediu essa chuva; null = estações do CEMADEN.</summary>
    public string? PostoChuvaMedida { get; set; }
    public double? VentoKmH { get; set; }
    public double? SensacaoTermica { get; set; }
    public IReadOnlyList<PontoAlagamentoCgeDto> AlagamentosCge { get; set; } = [];
}
