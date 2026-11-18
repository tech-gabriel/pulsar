using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.Domain.Cobertura;
using Pulsar.API.Domain.Score;
using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Orquestra a busca de endereços: valida a consulta, cacheia resultados por termo
/// (poupando a quota do provedor) e mapeia o resultado bruto para DTO.
/// </summary>
public class BuscaService : IBuscaService
{
    /// <summary>Tamanho mínimo da consulta para acionar o geocoding.</summary>
    public const int MinChars = 3;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);

    private readonly IGeocodingClient _geocodingClient;
    private readonly IMemoryCache _cache;
    private readonly IGradeCelulas _grade;

    public BuscaService(IGeocodingClient geocodingClient, IMemoryCache cache, IGradeCelulas grade)
    {
        _geocodingClient = geocodingClient;
        _cache = cache;
        _grade = grade;
    }

    public async Task<IReadOnlyList<EnderecoBuscaDto>> BuscarEnderecosAsync(string? consulta, IReadOnlyCollection<string> cidades, CancellationToken ct = default)
    {
        var termo = consulta?.Trim() ?? string.Empty;
        if (termo.Length < MinChars)
            return [];

        var bbox = CoberturaCidades.Bbox(cidades);
        var chave = $"busca:{bbox}:{termo.ToLowerInvariant()}";
        if (_cache.TryGetValue(chave, out IReadOnlyList<EnderecoBuscaDto>? cached) && cached is not null)
            return cached;

        var resultados = await _geocodingClient.BuscarAsync(termo, bbox, ct);
        var dtos = resultados
            // O bbox do provedor é por interseção: o município de Santos inteiro cruza a caixa da
            // capital e voltava para a conta comum. Só fica o ponto dentro da cobertura de quem busca.
            .Where(r => CoberturaCidades.Dentro(r.Latitude, r.Longitude, cidades))
            // O retângulo da capital também pega São Vicente, Praia Grande e a Zona Noroeste de Santos:
            // o trecho mais perto do ponto diz de que cidade ele é. Fora da grade, vale o retângulo.
            .Where(r => CidadeDoPonto(r.Latitude, r.Longitude) is not { } cidade || cidades.Contains(cidade))
            .Select(r => new EnderecoBuscaDto
            {
                Nome = SemCaixaAlta(string.IsNullOrWhiteSpace(r.Nome) ? r.Descricao : r.Nome),
                Descricao = SemCaixaAlta(r.Descricao),
                Tipo = r.Tipo,
                Latitude = r.Latitude,
                Longitude = r.Longitude,
            })
            // O MapTiler repete a mesma rua com outra grafia ("Rua da Mooca" e "RUA  DA MOOCA", CEPs
            // diferentes): para quem lê é o mesmo resultado, então fica só o primeiro (crítica de 15/11).
            .DistinctBy(d => ChaveDeDuplicata(d.Descricao))
            .ToList();
        // Um ponto de interesse que é só a rua com número ("Rua da Mooca 1001") repete o endereço
        // que já está na lista: sai.
        var ruas = dtos.Where(d => d.Tipo == "address").Select(d => ChaveDeDuplicata(d.Nome)).ToList();
        dtos.RemoveAll(d => d.Tipo == "poi" && ruas.Any(r => ChaveDeDuplicata(d.Nome).StartsWith(r + " ")));

        _cache.Set(chave, (IReadOnlyList<EnderecoBuscaDto>)dtos, CacheTtl);
        return dtos;
    }

    private string? CidadeDoPonto(double lat, double lon)
        => _grade.MaisProxima(lat, lon) is { } celula
            ? (CalibracaoScore.Baixada.Fatores.ContainsKey(celula.Sub) ? "Baixada Santista" : "São Paulo")
            : null;

    private static readonly HashSet<string> Conectivos = ["da", "de", "do", "das", "dos", "e"];

    /// <summary>
    /// Trecho escrito todo em maiúsculas ("RUA DA MOOCA") vira "Rua da Mooca"; o resto fica como veio.
    /// Vale por pedaço entre vírgulas, para "SP" e nomes já bem escritos não mudarem.
    /// Espaço repetido do cadastro ("Rua  Ameiros") vira um só.
    /// </summary>
    public static string SemCaixaAlta(string texto)
    {
        if (string.IsNullOrEmpty(texto)) return texto;
        var pt = System.Globalization.CultureInfo.GetCultureInfo("pt-BR");
        texto = System.Text.RegularExpressions.Regex.Replace(texto.Trim(), @"\s{2,}", " ");
        return string.Join(",", texto.Split(',').Select(pedaco =>
        {
            var palavras = pedaco.Split(' ');
            if (palavras.Count(p => p.Any(char.IsLetter)) < 2) return pedaco;
            if (pedaco != pedaco.ToUpper(pt))
            {
                // Já em caixa mista: só o conectivo com inicial maiúscula no meio ("Domingos De Morais").
                var inicio = true;
                return string.Join(" ", palavras.Select(p =>
                {
                    var meio = !inicio && p.Length > 0;
                    if (p.Length > 0) inicio = false;
                    return meio && p != "E" && Conectivos.Contains(p.ToLower(pt)) ? p.ToLower(pt) : p;
                }));
            }
            var primeira = true;
            return string.Join(" ", palavras.Select(p =>
            {
                if (p.Length == 0) return p;
                var baixa = p.ToLower(pt);
                var conectivo = !primeira && Conectivos.Contains(baixa);
                primeira = false;
                return conectivo ? baixa : char.ToUpper(baixa[0], pt) + baixa[1..];
            }));
        }));
    }

    /// <summary>Descrição sem CEP, acento, caixa e espaço repetido: dois resultados com a mesma chave são o mesmo para quem lê.</summary>
    public static string ChaveDeDuplicata(string descricao)
    {
        var semCep = System.Text.RegularExpressions.Regex.Replace(descricao ?? string.Empty, @"\b\d{5}-?\d{3}\b", " ");
        var semAcento = new string(semCep.Normalize(System.Text.NormalizationForm.FormD)
            .Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
            .ToArray());
        return System.Text.RegularExpressions.Regex.Replace(semAcento.ToLowerInvariant(), @"\s+", " ").Trim();
    }

    /// <summary>
    /// A rua não muda: o cache vale um dia, pelo ponto arredondado a uns 10 m (o centro de um trecho
    /// é sempre o mesmo, então cada trecho custa uma consulta ao MapTiler por dia).
    /// </summary>
    public async Task<RuaProxima?> RuaPertoAsync(double lat, double lon, CancellationToken ct = default)
    {
        var chave = string.Create(System.Globalization.CultureInfo.InvariantCulture, $"rua:{lat:0.0000},{lon:0.0000}");
        if (CacheRuas.TryGetValue(chave, out RuaProxima? cached)) return cached;
        var rua = await _geocodingClient.RuaPertoAsync(lat, lon, ct);
        // O provedor às vezes devolve o nome cru do cadastro ("RUA  COQUEIRAL"): o título do
        // cartão do trecho e o destino da rota mostram esse nome como veio.
        if (rua is not null) rua = rua with { Nome = SemCaixaAlta(rua.Nome) };
        CacheRuas.Set(chave, rua, new MemoryCacheEntryOptions { Size = 1, AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1) });
        return rua;
    }

    /// <summary>
    /// Cache próprio e com teto para as ruas: o ponto vem do app e pode ser qualquer um dentro de
    /// São Paulo, então sem teto um cliente encheria a memória da API. Os 2.277 centros de trecho
    /// cabem com folga; acima do teto o cache descarta os mais antigos.
    /// </summary>
    private static readonly MemoryCache CacheRuas = new(new MemoryCacheOptions { SizeLimit = 10_000, CompactionPercentage = 0.2 });
}
