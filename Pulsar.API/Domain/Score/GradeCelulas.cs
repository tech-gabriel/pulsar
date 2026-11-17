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
/// Grade em produção. Os arquivos <c>grade-sao-paulo.json</c> (modo <c>grade</c>) e
/// <c>grade-baixada-santista.json</c> (modo <c>grade-baixada</c>) são saída do Pulsar.Calibracao,
/// como <see cref="CalibracaoScore"/>: recalibrar = gerar de novo e commitar. A API só lê; não conhece H3.
/// </summary>
public sealed class GradeCelulas : IGradeCelulas
{
    private static readonly string[] Recursos =
    [
        "Pulsar.API.Domain.Score.grade-sao-paulo.json",
        "Pulsar.API.Domain.Score.grade-baixada-santista.json",
    ];
    private static readonly JsonSerializerOptions Opcoes = new() { PropertyNameCaseInsensitive = true };

    private readonly Dictionary<string, List<CelulaGrade>> _porArea;

    public GradeCelulas(ILogger<GradeCelulas> logger)
        : this([.. Recursos.Select(r => (Func<Stream?>)(() => Assembly.GetExecutingAssembly().GetManifestResourceStream(r)))], logger)
    {
    }

    public GradeCelulas(Func<Stream?> abrir, ILogger logger) : this([abrir], logger)
    {
    }

    /// <summary>
    /// Arquivo ausente ou inválido vira grade vazia e um erro no log, nunca exceção: o ciclo
    /// de coleta depende deste serviço para ser construído, e o risco por célula ainda é só
    /// conferência. Uma falha aqui não pode custar a coleta e o score. O teste que carrega
    /// o arquivo real é quem impede um arquivo quebrado de chegar à produção.
    /// </summary>
    /// <remarks>Cada arquivo falha sozinho: a grade de uma cidade quebrada não derruba a da outra.</remarks>
    public GradeCelulas(IReadOnlyList<Func<Stream?>> arquivos, ILogger logger)
    {
        var celulas = new List<CelulaGrade>();
        foreach (var abrir in arquivos)
        {
            try
            {
                using var stream = abrir() ?? throw new InvalidOperationException("Recurso da grade não encontrado.");
                var doArquivo = JsonSerializer.Deserialize<Arquivo>(stream, Opcoes)?.Celulas
                    ?? throw new InvalidOperationException("Arquivo da grade sem células.");
                if (doArquivo.Any(c => string.IsNullOrEmpty(c.Sub)))
                    throw new InvalidOperationException("Arquivo da grade com célula sem área.");
                celulas.AddRange(doArquivo);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Um arquivo da grade de células não carregou; o risco por trecho dessas áreas fica desligado.");
            }
        }
        _porArea = celulas.GroupBy(c => c.Sub).ToDictionary(g => g.Key, g => g.ToList());
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
