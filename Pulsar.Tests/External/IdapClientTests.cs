using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.External;

public class IdapClientTests
{
    private static Stream Amostra()
        => File.OpenRead(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", "idap-amostra.xml"));

    [Fact]
    public void Parse_LeAsEntradasValidas()
    {
        var alertas = IdapClient.Parse(Amostra());

        // A entrada sem <info> cai; as outras quatro ficam.
        alertas.Select(a => a.Identificador).Should().Equal("198620/2026", "198700/2026", "198701/2026", "198702/2026");
        var capital = alertas.Single(a => a.Identificador == "198700/2026");
        capital.Evento.Should().Be("CHUVAS INTENSAS");
        capital.Gravidade.Should().Be("Severe");
        capital.Urgencia.Should().Be("Expected");
        capital.TipoMensagem.Should().Be("Alert");
        capital.InicioUtc.Should().Be(new DateTime(2026, 11, 18, 17, 5, 0, DateTimeKind.Utc));
        capital.ExpiraUtc.Should().Be(new DateTime(2026, 11, 18, 20, 0, 0, DateTimeKind.Utc));
        capital.Emissor.Should().Be("Defesa Civil Estadual De São Paulo");
        capital.Titulo.Should().StartWith("Defesa Civil:14h05");
        capital.Poligonos.Should().ContainSingle().Which.Should().HaveCount(5);
        capital.Poligonos[0][0].Should().Be((-23.58, -46.67));
        capital.CodigosIbge.Should().BeEmpty();
        capital.Instrucao.Should().StartWith("Siga as orientações da defesa civil local");
    }

    [Fact]
    public void Parse_Cancel_TrazAReferencia()
    {
        var cancel = IdapClient.Parse(Amostra()).Single(a => a.Identificador == "198702/2026");

        cancel.TipoMensagem.Should().Be("Cancel");
        cancel.Referencias.Should().Contain("198700/2026");
    }

    [Fact]
    public void Parse_GeocodeIbge()
        => IdapClient.Parse(Amostra()).Single(a => a.Identificador == "198701/2026")
            .CodigosIbge.Should().Equal("3548500");

    // Exercício, teste de sistema ou alerta restrito não são alertas à população.
    [Theory]
    [InlineData("Exercise", "Public")]
    [InlineData("Test", "Public")]
    [InlineData("Actual", "Restricted")]
    public void Parse_SoActualEPublic(string status, string scope)
    {
        var xml = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", "idap-amostra.xml"))
            .Replace("<status>Actual</status>", $"<status>{status}</status>")
            .Replace("<scope>Public</scope>", $"<scope>{scope}</scope>");

        IdapClient.Parse(new MemoryStream(Encoding.UTF8.GetBytes(xml))).Should().BeEmpty();
    }

    // Uma entrada quebrada no meio de um feed de 13 MB não pode levar as outras junto.
    [Fact]
    public void Parse_EntradaComDataInvalida_DescartaSoEla()
    {
        var xml = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", "idap-amostra.xml"))
            .Replace("<expires>2026-11-18T14:50:00-03:00</expires>", "<expires>ontem</expires>");

        IdapClient.Parse(new MemoryStream(Encoding.UTF8.GetBytes(xml)))
            .Select(a => a.Identificador).Should().Equal("198700/2026", "198701/2026", "198702/2026");
    }

    private sealed class Falha : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
            => throw new HttpRequestException("fora do ar");
    }

    private sealed class Fabrica(HttpMessageHandler h, TimeSpan? timeout = null) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(h)
        {
            BaseAddress = new Uri("https://idapfile.mdr.gov.br/"), Timeout = timeout ?? TimeSpan.FromSeconds(100),
        };
    }

    /// <summary>Servidor que manda o cabeçalho e trava no meio do corpo.</summary>
    private sealed class CorpoTravado : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
            => Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new StreamContent(new Travado()) });
    }

    private sealed class Travado : Stream
    {
        public override int Read(byte[] buffer, int offset, int count) { Thread.Sleep(10_000); return 0; }
        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken ct = default)
        { await Task.Delay(Timeout.Infinite, ct); return 0; }
        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken ct)
            => ReadAsync(buffer.AsMemory(offset, count), ct).AsTask();
        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position { get => 0; set => throw new NotSupportedException(); }
        public override void Flush() { }
        public override long Seek(long o, SeekOrigin s) => throw new NotSupportedException();
        public override void SetLength(long v) => throw new NotSupportedException();
        public override void Write(byte[] b, int o, int c) => throw new NotSupportedException();
    }

    // O tempo limite precisa valer para o corpo inteiro (13 a 38 MB), não só até o cabeçalho:
    // senão uma conexão que trava no meio congela a leitura dos alertas para sempre.
    [Fact]
    public async Task ObterAsync_CorpoTravado_DesisteNoTempoLimite()
    {
        var client = new IdapClient(new Fabrica(new CorpoTravado(), TimeSpan.FromMilliseconds(300)), NullLogger<IdapClient>.Instance);

        var leitura = Task.Run(() => client.ObterAsync());
        var terminou = await Task.WhenAny(leitura, Task.Delay(5_000)) == leitura;

        terminou.Should().BeTrue();
        (await leitura).Should().BeNull();
    }

    // XML quebrado numa entrada (um "&" sem escape no texto, por exemplo) derruba o XmlReader. O feed
    // vem do mais antigo para o mais novo: parar ali perderia justamente os alertas novos.
    [Fact]
    public void Parse_EntradaComXmlQuebrado_DescartaSoEla()
    {
        var xml = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "External", "Fixtures", "idap-amostra.xml"))
            .Replace("<expires>2026-11-18T14:50:00-03:00</expires>", "<expires>2026-11-18T14:50:00-03:00</expires><note>Chuva & vento</note>");

        IdapClient.Parse(new MemoryStream(Encoding.UTF8.GetBytes(xml)))
            .Select(a => a.Identificador).Should().Equal("198700/2026", "198701/2026", "198702/2026");
    }

    [Fact]
    public async Task ObterAsync_FalhaDeRede_DevolveNull()
    {
        var client = new IdapClient(new Fabrica(new Falha()), NullLogger<IdapClient>.Instance);

        (await client.ObterAsync()).Should().BeNull();
    }
}
