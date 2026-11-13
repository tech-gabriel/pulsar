using System.Reflection;
using System.Text.Json;

namespace Pulsar.API.Domain.Score;

/// <summary>Uma célula H3 da grade: o trecho, a área a que pertence e o fator de suscetibilidade dele.</summary>
public sealed record CelulaGrade(string H3, double Lat, double Lon, string Sub, double Fator);

public interface IGradeCelulas
{
    /// <summary>Células de uma área, pelo nome dela no banco. Área desconhecida devolve lista vazia.</summary>
    IReadOnlyList<CelulaGrade> DaArea(string nomeSubprefeitura);
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

    public GradeCelulas()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(Recurso)
            ?? throw new InvalidOperationException($"Recurso da grade não encontrado: {Recurso}");
        var arquivo = JsonSerializer.Deserialize<Arquivo>(stream, Opcoes)
            ?? throw new InvalidOperationException("Arquivo da grade vazio.");
        _porArea = arquivo.Celulas.GroupBy(c => c.Sub).ToDictionary(g => g.Key, g => g.ToList());
    }

    public IReadOnlyList<CelulaGrade> DaArea(string nomeSubprefeitura)
        => _porArea.TryGetValue(nomeSubprefeitura, out var celulas) ? celulas : [];

    private sealed record Arquivo(List<CelulaGrade> Celulas);
}
