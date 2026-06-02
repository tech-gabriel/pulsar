using FluentAssertions;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.External;

public class CgespNoticiaClientTests
{
    private const string RssExemplo = """
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Notícias do CGE</title>
            <link>noticias.jsp</link>
            <description>Notícias sobre emergências na cidade de São Paulo</description>
            <item>
              <guid>55070</guid>
              <pubDate>Ter, 02 jun 2026 08:13:55 GMT</pubDate>
              <title>Sol entre nuvens e sensação de frio na manhã paulistana</title>
              <link>noticias.jsp?id=55070</link>
              <description>&lt;p style="text-align: justify;"&gt;A terça-feira começou gelada na capital.&lt;/p&gt;</description>
            </item>
            <item>
              <guid>55068</guid>
              <pubDate>Ter, 02 jun 2026 03:22:10 GMT</pubDate>
              <title>Madrugada segue com sensação de frio</title>
              <link>noticias.jsp?id=55068</link>
              <description>Temperaturas baixas durante a madrugada.</description>
            </item>
          </channel>
        </rss>
        """;

    [Fact]
    public void ParseRss_FeedValido_RetornaTodosOsItens()
    {
        var noticias = CgespNoticiaClient.ParseRss(RssExemplo);

        noticias.Should().HaveCount(2);
    }

    [Fact]
    public void ParseRss_FeedValido_MapeiaTituloEFonte()
    {
        var noticia = CgespNoticiaClient.ParseRss(RssExemplo).First();

        noticia.Titulo.Should().Be("Sol entre nuvens e sensação de frio na manhã paulistana");
        noticia.Fonte.Should().Be("CGE-SP");
        noticia.FonteUrl.Should().Be("https://www.cgesp.org/");
    }

    [Fact]
    public void ParseRss_LinkRelativo_ResolveParaUrlAbsoluta()
    {
        var noticia = CgespNoticiaClient.ParseRss(RssExemplo).First();

        noticia.Link.Should().Be("https://www.cgesp.org/v3/noticias.jsp?id=55070");
    }

    [Fact]
    public void ParseRss_DescricaoComHtml_RemoveTagsEDecodifica()
    {
        var noticia = CgespNoticiaClient.ParseRss(RssExemplo).First();

        noticia.Resumo.Should().Be("A terça-feira começou gelada na capital.");
        noticia.Resumo.Should().NotContain("<");
    }

    [Fact]
    public void ParseRss_PubDatePtBr_ConverteParaUtcCorretamente()
    {
        var noticia = CgespNoticiaClient.ParseRss(RssExemplo).First();

        noticia.PublicadoEm.Should().Be(new DateTime(2026, 6, 2, 8, 13, 55, DateTimeKind.Utc));
    }

    [Fact]
    public void ParseRss_OrdenaPorDataDecrescente()
    {
        var noticias = CgespNoticiaClient.ParseRss(RssExemplo);

        noticias.Should().BeInDescendingOrder(n => n.PublicadoEm);
        noticias.First().PublicadoEm.Should().BeAfter(noticias.Last().PublicadoEm);
    }

    [Fact]
    public void ParseRss_DescricaoLonga_TruncaCom240Caracteres()
    {
        var textoLongo = string.Concat(Enumerable.Repeat("palavra ", 100));
        var xml = $"""
            <rss version="2.0"><channel>
              <item>
                <title>Teste</title>
                <link>noticias.jsp?id=1</link>
                <pubDate>Seg, 01 jun 2026 10:00:00 GMT</pubDate>
                <description>{textoLongo}</description>
              </item>
            </channel></rss>
            """;

        var noticia = CgespNoticiaClient.ParseRss(xml).First();

        noticia.Resumo.Length.Should().BeLessThanOrEqualTo(241); // 240 + reticências
        noticia.Resumo.Should().EndWith("…");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void ParseRss_XmlVazio_RetornaListaVazia(string xml)
    {
        var noticias = CgespNoticiaClient.ParseRss(xml);

        noticias.Should().BeEmpty();
    }

    [Fact]
    public void ParseRss_ItemSemTitulo_EhIgnorado()
    {
        var xml = """
            <rss version="2.0"><channel>
              <item>
                <link>noticias.jsp?id=1</link>
                <pubDate>Seg, 01 jun 2026 10:00:00 GMT</pubDate>
                <description>Sem título.</description>
              </item>
            </channel></rss>
            """;

        CgespNoticiaClient.ParseRss(xml).Should().BeEmpty();
    }
}
