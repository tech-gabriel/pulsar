using System.Net;
using FluentAssertions;
using Pulsar.Calibracao;

namespace Pulsar.Tests.Calibracao;

public class FonteSgbTests
{
    private static string Feature(string municipio, string? classe, double lon)
    {
        var c = System.Globalization.CultureInfo.InvariantCulture;
        var props = "\"municipio\":\"" + municipio + "\"" + (classe is null ? "" : ",\"classe\":\"" + classe + "\"");
        var a = lon.ToString(c);
        var b = (lon + 0.01).ToString(c);
        return "{\"type\":\"Feature\",\"properties\":{" + props + "},\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[["
            + a + ",-24.0],[" + b + ",-24.0],[" + b + ",-23.99],[" + a + ",-24.0]]]}}";
    }

    private static string Colecao(bool continua, params string[] features)
        => "{\"type\":\"FeatureCollection\",\"exceededTransferLimit\":" + (continua ? "true" : "false")
            + ",\"features\":[" + string.Join(",", features) + "]}";

    [Fact]
    public void Ler_FicaSoComOsNoveMunicipios_ComONomeDaArea()
    {
        var r = FonteSgb.Ler(Colecao(false,
            Feature("SANTOS", "Alta", -46.33), Feature("ITANHAÉM (SP)", "Média", -46.78), Feature("COTIA", "Alta", -46.9)));

        r.Select(p => (p.Municipio, p.Classe)).Should().BeEquivalentTo(new[] { ("Santos", "Alta"), ("Itanhaém", "Média") });
    }

    [Fact]
    public void Ler_ComClasseFixa_IgnoraOCampoClasse()
        => FonteSgb.Ler(Colecao(false, Feature("GUARUJÁ", null, -46.25)), "Enxurrada")
            .Single().Classe.Should().Be("Enxurrada");

    private sealed class Paginas(Queue<string> respostas, List<string> urls) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
        {
            urls.Add(r.RequestUri!.ToString());
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(respostas.Count > 0 ? respostas.Dequeue() : Colecao(false)) });
        }
    }

    // Sem seguir o exceededTransferLimit, Cubatão (650 polígonos) chegaria pela metade.
    [Fact]
    public async Task PoligonosAsync_SegueAsPaginasAteAcabar()
    {
        var urls = new List<string>();
        var respostas = new Queue<string>([
            Colecao(true, Feature("SANTOS", "Alta", -46.33)),
            Colecao(false, Feature("CUBATÃO", "Média", -46.42)),
        ]);
        var cache = Directory.CreateTempSubdirectory().FullName;

        var r = await FonteSgb.PoligonosAsync(new HttpClient(new Paginas(respostas, urls)), cache);

        r.Where(p => p.Classe is "Alta" or "Média").Select(p => p.Municipio).Should().BeEquivalentTo(new[] { "Santos", "Cubatão" });
        urls.Should().Contain(u => u.Contains("inundacao") && u.Contains($"resultOffset={FonteSgb.TamanhoPagina}"));
    }
}
