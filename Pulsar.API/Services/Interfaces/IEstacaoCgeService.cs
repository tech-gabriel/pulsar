namespace Pulsar.API.Services.Interfaces;

/// <summary>
/// A chuva medida que vale para uma subprefeitura agora. Mm15/Mm30/Mm60 null = não dá para
/// afirmar aquela janela (falta leitura de base); zero é chuva nenhuma medida.
/// </summary>
/// <param name="Vizinho">True quando o posto é de outra subprefeitura (a região não tem posto próprio válido).</param>
/// <param name="ColetadoEm">Horário da nossa última coleta do posto, em UTC.</param>
public record ChuvaMedidaRegiao(
    Guid SubprefeituraId, int Posto, string NomePosto, bool Vizinho,
    double? Mm15, double? Mm30, double? Mm60, double AcumuladoPeriodoMm, DateTime ColetadoEm);

public interface IEstacaoCgeService
{
    /// <summary>Lê os postos do CGE-SP e grava uma leitura de cada. Posto que falha é pulado.</summary>
    Task ColetarAsync(CancellationToken ct = default);

    /// <summary>
    /// Uma entrada por subprefeitura ativa com dado medido válido (posto próprio ou vizinho próximo).
    /// Subprefeitura ausente = sem dado medido agora (a tela mostra "estimado").
    /// </summary>
    Task<IReadOnlyDictionary<Guid, ChuvaMedidaRegiao>> ObterPorSubprefeituraAsync(DateTime agoraUtc, CancellationToken ct = default);
}
