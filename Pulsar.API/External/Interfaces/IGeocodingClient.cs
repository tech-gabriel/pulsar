namespace Pulsar.API.External.Interfaces;

/// <summary>
/// Abstrai o provedor de geocoding (hoje MapTiler; trocável por Google no futuro
/// sem tocar no serviço/controller — basta uma nova implementação registrada no DI).
/// </summary>
public interface IGeocodingClient
{
    Task<IReadOnlyList<EnderecoGeocodificado>> BuscarAsync(string consulta, CancellationToken ct = default);

    /// <summary>A rua mais perto de um ponto (geocoding reverso). Null sem chave, sem resultado ou fora de alcance.</summary>
    Task<RuaProxima?> RuaPertoAsync(double lat, double lon, CancellationToken ct = default);
}

/// <summary>Rua mais perto de um ponto e a distância até o endereço que a nomeou, em metros.</summary>
public sealed record RuaProxima(string Nome, double Metros);

/// <summary>
/// Resultado bruto de geocoding, independente do provedor.
/// <paramref name="Nome"/> é o rótulo principal (ex.: "Shopping Eldorado") e
/// <paramref name="Tipo"/> a categoria do provedor (ex.: "poi", "address", "place").
/// </summary>
public record EnderecoGeocodificado(
    string Descricao, double Latitude, double Longitude, string Nome = "", string Tipo = "");
