namespace Pulsar.API.External.Interfaces;

/// <summary>
/// O que a página de um posto do CGE-SP mostra. A chuva é ACUMULADA desde o zeramento, não por
/// hora: a chuva de uma janela sai da diferença entre leituras (ver ChuvaMedida).
/// </summary>
public record EstacaoCgeBruta(
    double ChuvaPeriodoMm, double ChuvaPeriodoAnteriorMm, TimeOnly? Zeramento,
    double? TemperaturaC, double? UmidadePct,
    string? VentoDirecao, double? VentoKmH, double? RajadaKmH, double? PressaoHpa);

public interface ICgeEstacaoClient
{
    /// <summary>Null quando a página não traz a chuva do período (layout mudou, posto fora).</summary>
    Task<EstacaoCgeBruta?> ObterAsync(int posto, CancellationToken ct = default);
}
