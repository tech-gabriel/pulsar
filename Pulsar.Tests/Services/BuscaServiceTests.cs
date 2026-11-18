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
    private static readonly string[] Capital = ["São Paulo"];

    private sealed class StubGeocodingClient : IGeocodingClient
    {
        public int Chamadas { get; private set; }
        public string NomeRua { get; set; } = "Rua Taquari";
        public IReadOnlyList<EnderecoGeocodificado> Resultado { get; set; } = [];

        public Task<IReadOnlyList<EnderecoGeocodificado>> BuscarAsync(string consulta, string bbox, CancellationToken ct = default)
        {
            Chamadas++;
            return Task.FromResult(Resultado);
        }

        public Task<RuaProxima?> RuaPertoAsync(double lat, double lon, CancellationToken ct = default)
        {
            Chamadas++;
            return Task.FromResult<RuaProxima?>(new RuaProxima(NomeRua, 40));
        }
    }

    // O centro de um trecho é sempre o mesmo: a rua dele custa uma consulta só.
    [Fact]
    public async Task RuaPerto_MesmoPonto_ConsultaOProvedorUmaVez()
    {
        var stub = new StubGeocodingClient();
        var service = CriarService(stub);

        (await service.RuaPertoAsync(-23.61101, -46.70101))!.Nome.Should().Be("Rua Taquari");
        (await service.RuaPertoAsync(-23.61102, -46.70102))!.Nome.Should().Be("Rua Taquari");

        stub.Chamadas.Should().Be(1);
    }

    // O cadastro às vezes vem em caixa alta e com espaço dobrado: o nome sai como se lê.
    [Fact]
    public async Task RuaPerto_NomeEmCaixaAltaComEspacoDobrado_SaiLimpo()
    {
        var stub = new StubGeocodingClient { NomeRua = "RUA  PINHEIRO DA SILVA " };
        (await CriarService(stub).RuaPertoAsync(-23.588, -46.572))!.Nome.Should().Be("Rua Pinheiro da Silva");
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

        var resultado = await service.BuscarEnderecosAsync(termo, Capital);

        resultado.Should().BeEmpty();
        stub.Chamadas.Should().Be(0);
    }

    // A mesma rua com outra grafia e outro CEP aparece uma vez só.
    [Fact]
    public async Task BuscarEnderecos_MesmaRuaComOutraGrafia_FicaUmaVez()
    {
        var stub = new StubGeocodingClient
        {
            Resultado =
            [
                new("Rua da Mooca, São Paulo, São Paulo 03104-000, Brasil", -23.555, -46.604, "Rua da Mooca", "address"),
                new("RUA  DA MOOCA, São Paulo, São Paulo 03114-000, Brasil", -23.556, -46.600, "RUA  DA MOOCA", "address"),
                new("Rua Da Mooca 1001, São Paulo, São Paulo 03104-000, Brasil", -23.554, -46.615, "Rua Da Mooca 1001", "poi"),
            ],
        };

        var resultado = await CriarService(stub).BuscarEnderecosAsync("rua da mooca dedupe", Capital);

        // O POI "Rua Da Mooca 1001" é a mesma rua com número: sai também.
        resultado.Select(r => r.Nome).Should().Equal("Rua da Mooca");
    }

    [Fact]
    public async Task BuscarEnderecos_PoiDeOutroNome_Fica()
    {
        var stub = new StubGeocodingClient
        {
            Resultado =
            [
                new("Rua da Mooca, São Paulo", -23.555, -46.604, "Rua da Mooca", "address"),
                new("Museu da Imigração, São Paulo", -23.554, -46.615, "Museu da Imigração", "poi"),
            ],
        };

        var resultado = await CriarService(stub).BuscarEnderecosAsync("mooca poi outro", Capital);

        resultado.Should().HaveCount(2);
    }

    [Theory]
    [InlineData("RUA  DA MOOCA", "Rua da Mooca")]
    [InlineData("Rua  Ameiros, São Paulo", "Rua Ameiros, São Paulo")]
    [InlineData("AVENIDA PAULISTA, São Paulo, SP", "Avenida Paulista, São Paulo, SP")]
    [InlineData("Rua da Mooca", "Rua da Mooca")]
    [InlineData("DE OLHO", "De Olho")]
    [InlineData("Rua Domingos De Morais 168", "Rua Domingos de Morais 168")]
    [InlineData("Rua E, São Paulo", "Rua E, São Paulo")]
    public void SemCaixaAlta_SoMudaOTrechoTodoEmMaiusculas(string entrada, string esperado)
        => BuscaService.SemCaixaAlta(entrada).Should().Be(esperado);

    [Fact]
    public async Task BuscarEnderecos_TermoValido_MapeiaResultados()
    {
        var stub = new StubGeocodingClient
        {
            Resultado = [new EnderecoGeocodificado("Av. Paulista, São Paulo", -23.561, -46.656, "Av. Paulista", "address")]
        };
        var service = CriarService(stub);

        var resultado = await service.BuscarEnderecosAsync("paulista", Capital);

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

        await service.BuscarEnderecosAsync("paulista", Capital);
        // Trim + lower geram a mesma chave de cache → não chama o client de novo.
        await service.BuscarEnderecosAsync("  PAULISTA ", Capital);

        stub.Chamadas.Should().Be(1);
    }

    // O Admin (com a Baixada) e a conta comum veem resultados diferentes para o mesmo termo:
    // o cache de um não pode servir o outro.
    [Fact]
    public async Task Busca_CacheSeparaPorCobertura()
    {
        var stub = new StubGeocodingClient { Resultado = [new EnderecoGeocodificado("X", 1, 2)] };
        var service = CriarService(stub);

        await service.BuscarEnderecosAsync("avenida ana costa", Capital);
        await service.BuscarEnderecosAsync("avenida ana costa", ["São Paulo", "Baixada Santista"]);

        stub.Chamadas.Should().Be(2);
    }
}
