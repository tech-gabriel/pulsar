using System.Collections.Concurrent;
using Pulsar.API.External.Interfaces;

namespace Pulsar.Tests.Helpers;

/// <summary>
/// Geocoding falso para testes de integração: devolve resultados determinísticos sem rede.
/// Guarda o bbox recebido por termo, para os testes conferirem a cobertura de cada pessoa.
/// </summary>
public class FakeGeocodingClient : IGeocodingClient
{
    public static readonly ConcurrentDictionary<string, string> BboxPorConsulta = new();

    public Task<IReadOnlyList<EnderecoGeocodificado>> BuscarAsync(string consulta, string bbox, CancellationToken ct = default)
    {
        BboxPorConsulta[consulta] = bbox;
        return Task.FromResult<IReadOnlyList<EnderecoGeocodificado>>(
        [
            // Coordenadas plausíveis no município de São Paulo.
            new($"{consulta} — resultado 1, São Paulo", -23.5613, -46.6560, consulta, "poi"),
            new($"{consulta} — resultado 2, São Paulo", -23.5700, -46.6400, consulta, "address"),
        ]);
    }

    public Task<RuaProxima?> RuaPertoAsync(double lat, double lon, CancellationToken ct = default)
        => Task.FromResult<RuaProxima?>(new RuaProxima("Rua Taquari", 40));
}
