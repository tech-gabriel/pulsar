namespace Pulsar.API.External.Http;

/// <summary>
/// A vez de cada chamada: intervalo mínimo entre o início de duas, mesmo concorrentes. Fica
/// fora do handler porque o HttpClientFactory recria os handlers de tempos em tempos e o ritmo
/// precisa valer entre todos eles (singleton por cliente).
/// </summary>
public sealed class RitmoChamadas(TimeSpan intervaloMinimo)
{
    private readonly SemaphoreSlim _vez = new(1, 1);
    private DateTime _ultimaSaida = DateTime.MinValue;

    public async Task EsperarVezAsync(CancellationToken ct)
    {
        await _vez.WaitAsync(ct);
        try
        {
            var espera = _ultimaSaida + intervaloMinimo - DateTime.UtcNow;
            if (espera > TimeSpan.Zero) await Task.Delay(espera, ct);
            _ultimaSaida = DateTime.UtcNow;
        }
        finally
        {
            _vez.Release();
        }
    }
}

/// <summary>
/// Segura o ritmo das chamadas de um cliente HTTP. Existe pelo teto de 60 chamadas por minuto
/// do OpenWeatherMap: com a Baixada (41 áreas) e a previsão no ciclo da hora cheia, a coleta
/// passava dele e a área que levava 429 ficava 15 minutos sem leitura.
/// </summary>
public sealed class RitmoChamadasHandler(RitmoChamadas ritmo) : DelegatingHandler
{
    public RitmoChamadasHandler(TimeSpan intervaloMinimo) : this(new RitmoChamadas(intervaloMinimo))
    {
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        await ritmo.EsperarVezAsync(ct);
        return await base.SendAsync(request, ct);
    }
}
