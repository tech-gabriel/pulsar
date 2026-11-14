using System.Reflection;
using System.Text.Json;

namespace Pulsar.API.Domain.Score;

/// <summary>Uma célula H3 da grade: o trecho, a área a que pertence e o fator de suscetibilidade dele.</summary>
public sealed record CelulaGrade(string H3, double Lat, double Lon, string Sub, double Fator);

public interface IGradeCelulas
{
    /// <summary>Células de uma área, pelo nome dela no banco. Área desconhecida devolve lista vazia.</summary>
    IReadOnlyList<CelulaGrade> DaArea(string nomeSubprefeitura);

    /// <summary>
    /// O trecho de um endereço: a célula com o centro mais perto do ponto. Null quando o
    /// ponto está fora da grade (longe de qualquer célula).
    /// </summary>
    CelulaGrade? MaisProxima(double lat, double lon);
}

/// <summary>
/// Grade em produção. O arquivo <c>grade-sao-paulo.json</c> é saída do Pulsar.Calibracao
/// (modo <c>grade</c>), como <see cref="CalibracaoScore"/>: recalibrar = gerar de novo e
/// commitar. A API só lê; não conhece H3.
/// </summary>
public sealed class GradeCelulas : IGradeCelulas
{
    private const string Recurso = "Pulsar.API.Domain.Score.grade-sao-paulo.json";
    private static readonly JsonSerializerOptions Opcoes = new() { PropertyNameCaseInsensitive = true };

    private readonly Dictionary<string, List<CelulaGrade>> _porArea;

    public GradeCelulas(ILogger<GradeCelulas> logger)
        : this(() => Assembly.GetExecutingAssembly().GetManifestResourceStream(Recurso), logger)
    {
    }

    /// <summary>
    /// Arquivo ausente ou inválido vira grade vazia e um erro no log, nunca exceção: o ciclo
    /// de coleta depende deste serviço para ser construído, e o risco por célula ainda é só
    /// conferência. Uma falha aqui não pode custar a coleta e o score. O teste que carrega
    /// o arquivo real é quem impede um arquivo quebrado de chegar à produção.
    /// </summary>
    public GradeCelulas(Func<Stream?> abrir, ILogger logger)
    {
        try
        {
            using var stream = abrir() ?? throw new InvalidOperationException($"Recurso da grade não encontrado: {Recurso}");
            var celulas = JsonSerializer.Deserialize<Arquivo>(stream, Opcoes)?.Celulas
                ?? throw new InvalidOperationException("Arquivo da grade sem células.");
            _porArea = celulas.GroupBy(c => c.Sub).ToDictionary(g => g.Key, g => g.ToList());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Grade de células não carregou; o risco por trecho fica desligado.");
            _porArea = [];
        }
    }

    public IReadOnlyList<CelulaGrade> DaArea(string nomeSubprefeitura)
        => _porArea.TryGetValue(nomeSubprefeitura, out var celulas) ? celulas : [];

    /// <summary>
    /// Do centro ao canto de um hexágono de resolução 8 são uns 530 m. Além desta folga, o
    /// ponto não está em trecho nenhum da grade.
    /// </summary>
    private const double AlcanceMetros = 700;

    // ponytail: varre as 2.277 células por endereço (poucos lugares salvos por ciclo). Índice
    // espacial quando a grade crescer para outras cidades ou os lugares passarem de milhares.
    public CelulaGrade? MaisProxima(double lat, double lon)
    {
        CelulaGrade? melhor = null;
        var menor = AlcanceMetros;
        foreach (var c in _porArea.Values.SelectMany(v => v))
        {
            var metros = Pulsar.API.Services.GeoDistancia.HaversineMetros(lat, lon, c.Lat, c.Lon);
            if (metros <= menor) (melhor, menor) = (c, metros);
        }
        return melhor;
    }

    private sealed record Arquivo(List<CelulaGrade>? Celulas);
}
