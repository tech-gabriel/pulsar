using Pulsar.API.External.Interfaces;

namespace Pulsar.Tests.Helpers;

/// <summary>
/// Geocoding determinístico para testes — não faz chamadas de rede. Permite testar
/// o endpoint GET /api/busca/enderecos offline (sem chave/quota do MapTiler).
/// </summary>
public class FakeGeocodingClient : IGeocodingClient
{
    public Task<IReadOnlyList<EnderecoGeocodificado>> BuscarAsync(string consulta, CancellationToken ct = default)
        => Task.FromResult<IReadOnlyList<EnderecoGeocodificado>>(
        [
            // Coordenadas plausíveis no município de São Paulo.
            new($"{consulta} — resultado 1, São Paulo", -23.5613, -46.6560),
            new($"{consulta} — resultado 2, São Paulo", -23.5700, -46.6400),
        ]);
}
