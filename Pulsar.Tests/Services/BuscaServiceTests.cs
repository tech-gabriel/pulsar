using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Services;

namespace Pulsar.Tests.Services;

/// <summary>
/// Testes unitários do BuscaService: validação de termo, mapeamento do resultado
/// do provedor e cache por termo (poupando quota do geocoding).
/// </summary>
public class BuscaServiceTests
{
    private sealed class StubGeocodingClient : IGeocodingClient
    {
        public int Chamadas { get; private set; }
        public IReadOnlyList<EnderecoGeocodificado> Resultado { get; set; } = [];

        public Task<IReadOnlyList<EnderecoGeocodificado>> BuscarAsync(string consulta, CancellationToken ct = default)
        {
            Chamadas++;
            return Task.FromResult(Resultado);
        }
    }

    private static BuscaService CriarService(IGeocodingClient client)
        => new(client, new MemoryCache(new MemoryCacheOptions()));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ab")]
    public async Task BuscarEnderecos_TermoCurto_RetornaVazioSemChamarClient(string? termo)
    {
        var stub = new StubGeocodingClient();
        var service = CriarService(stub);

        var resultado = await service.BuscarEnderecosAsync(termo);

        resultado.Should().BeEmpty();
        stub.Chamadas.Should().Be(0);
    }

    [Fact]
    public async Task BuscarEnderecos_TermoValido_MapeiaResultados()
    {
        var stub = new StubGeocodingClient
        {
            Resultado = [new EnderecoGeocodificado("Av. Paulista, São Paulo", -23.561, -46.656, "Av. Paulista", "address")]
        };
        var service = CriarService(stub);

        var resultado = await service.BuscarEnderecosAsync("paulista");

        resultado.Should().HaveCount(1);
        resultado[0].Nome.Should().Be("Av. Paulista");
        resultado[0].Tipo.Should().Be("address");
        resultado[0].Descricao.Should().Be("Av. Paulista, São Paulo");
        resultado[0].Latitude.Should().Be(-23.561);
        resultado[0].Longitude.Should().Be(-46.656);
    }

    [Fact]
    public async Task BuscarEnderecos_MesmoTermo_UsaCacheNaSegundaChamada()
    {
        var stub = new StubGeocodingClient
        {
            Resultado = [new EnderecoGeocodificado("X", 1, 2)]
        };
        var service = CriarService(stub);

        await service.BuscarEnderecosAsync("paulista");
        // Trim + lower geram a mesma chave de cache → não chama o client de novo.
        await service.BuscarEnderecosAsync("  PAULISTA ");

        stub.Chamadas.Should().Be(1);
    }
}
