using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Pulsar.API.External.Interfaces;

namespace Pulsar.API.External.Clients;

/// <summary>
/// PED do CEMADEN (rede nacional de pluviômetros), conferido ao vivo em 2026-11-11. O login no
/// SGAA devolve um token de cerca de 4 h, que vai no cabeçalho "token" das chamadas de dados.
/// Singleton: o token vive em memória entre os ciclos. Nenhuma mensagem de erro daqui cita
/// e-mail, senha, token ou o corpo da resposta do login.
/// </summary>
public class CemadenClient : ICemadenClient
{
    /// <summary>Renova antes de vencer, para não gastar uma chamada só para descobrir o 401.</summary>
    private static readonly TimeSpan FolgaDoToken = TimeSpan.FromMinutes(5);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly SemaphoreSlim _trava = new(1, 1);
    private string? _token;
    private DateTime _tokenVence;

    public CemadenClient(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    private string? Email => _configuration["Cemaden:Email"];
    private string? Senha => _configuration["Cemaden:Senha"];

    public bool Configurado => !string.IsNullOrWhiteSpace(Email) && !string.IsNullOrWhiteSpace(Senha);

    public async Task<IReadOnlyList<AcumuladoCemaden>> ObterAcumuladosAsync(string codIbge, CancellationToken ct = default)
        => ParseAcumulados(await ObterAsync($"pcds-acum/acumulados-recentes?codibge={Uri.EscapeDataString(codIbge)}", ct));

    public async Task<IReadOnlyList<CadastroCemaden>> ObterCadastroAsync(string codIbge, CancellationToken ct = default)
        => ParseCadastro(await ObterAsync($"pcds-cadastro/dados-cadastrais?codibge={Uri.EscapeDataString(codIbge)}", ct));

    private async Task<string> ObterAsync(string caminho, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("cemaden-ped");
        // Uma segunda tentativa só, com token novo: 401 de novo é problema de conta, não de validade.
        for (var tentativa = 1; ; tentativa++)
        {
            using var pedido = new HttpRequestMessage(HttpMethod.Get, caminho);
            pedido.Headers.Add("token", await TokenAsync(ct));
            using var resposta = await client.SendAsync(pedido, ct);
            if (resposta.StatusCode == HttpStatusCode.Unauthorized && tentativa == 1)
            {
                _token = null;
                continue;
            }
            if (!resposta.IsSuccessStatusCode)
                throw new HttpRequestException($"PED do CEMADEN respondeu HTTP {(int)resposta.StatusCode}.", null, resposta.StatusCode);
            return await resposta.Content.ReadAsStringAsync(ct);
        }
    }

    private async Task<string> TokenAsync(CancellationToken ct)
    {
        await _trava.WaitAsync(ct);
        try
        {
            if (_token is not null && DateTime.UtcNow < _tokenVence) return _token;

            var client = _httpClientFactory.CreateClient("cemaden-token");
            using var resposta = await client.PostAsJsonAsync("controle-token/tokens", new { email = Email, password = Senha }, ct);
            if (!resposta.IsSuccessStatusCode)
                throw new HttpRequestException($"Login no CEMADEN respondeu HTTP {(int)resposta.StatusCode}.", null, resposta.StatusCode);

            using var json = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync(ct));
            var token = json.RootElement.TryGetProperty("token", out var t) ? t.GetString() : null;
            if (string.IsNullOrEmpty(token))
                throw new HttpRequestException("Login no CEMADEN não devolveu token.");

            // O SGAA manda timeToExp como texto ("13200"). Ilegível vira zero: o token vale só
            // para esta chamada e a próxima pede outro, o que é lento mas correto.
            var segundos = json.RootElement.TryGetProperty("timeToExp", out var e) ? e.ValueKind switch
            {
                JsonValueKind.Number when e.TryGetDouble(out var n) => n,
                JsonValueKind.String when double.TryParse(e.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var n) => n,
                _ => 0,
            } : 0;
            _token = token;
            _tokenVence = DateTime.UtcNow.AddSeconds(segundos) - FolgaDoToken;
            return token;
        }
        finally
        {
            _trava.Release();
        }
    }

    /// <summary>Público e estático para ser testável com a resposta salva. Item ruim é pulado; corpo que não é lista vira vazio.</summary>
    public static IReadOnlyList<AcumuladoCemaden> ParseAcumulados(string json)
        => [.. Itens(json).Select(i =>
        {
            if (Texto(i, "codestacao") is not { } cod || Texto(i, "datahora") is not { } data
                || !DateTime.TryParse(data, CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dataHora))
                return null;
            return new AcumuladoCemaden(cod, dataHora,
                Numero(i, "acc1hr"), Numero(i, "acc3hr"), Numero(i, "acc6hr"), Numero(i, "acc12hr"), Numero(i, "acc24hr"),
                Numero(i, "acc48hr"), Numero(i, "acc72hr"), Numero(i, "acc96hr"), Numero(i, "acc120hr"));
        }).OfType<AcumuladoCemaden>()];

    public static IReadOnlyList<CadastroCemaden> ParseCadastro(string json)
        => [.. Itens(json).Select(i =>
            Texto(i, "codestacao") is { } cod && Numero(i, "latitude") is { } lat && Numero(i, "longitude") is { } lon
                ? new CadastroCemaden(cod, Texto(i, "nome") ?? cod, lat, lon)
                : null).OfType<CadastroCemaden>()];

    private static List<JsonElement> Itens(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.ValueKind == JsonValueKind.Array
                ? [.. doc.RootElement.EnumerateArray().Where(i => i.ValueKind == JsonValueKind.Object).Select(i => i.Clone())]
                : [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string? Texto(JsonElement item, string campo)
        => item.TryGetProperty(campo, out var v) && v.ValueKind == JsonValueKind.String && v.GetString() is { Length: > 0 } s ? s : null;

    private static double? Numero(JsonElement item, string campo)
        => item.TryGetProperty(campo, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetDouble(out var n) ? n : null;
}
