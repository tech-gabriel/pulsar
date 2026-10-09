using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Pulsar.API.DTOs;
using Pulsar.Tests.Helpers;

namespace Pulsar.Tests.Controllers;

/// <summary>
/// Inscrição de push (auditoria de 2026-10-09): o servidor faz POST no Endpoint enviado
/// pelo cliente, então ele só pode apontar para serviço de push conhecido (sem SSRF), e cada
/// pessoa tem um teto de inscrições (sem inchar o banco).
/// </summary>
public class SegurancaPushTests : IClassFixture<PulsarWebApplicationFactory>
{
    private readonly WebApplicationFactory<Program> _factory;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public SegurancaPushTests(PulsarWebApplicationFactory factory)
    {
        var vapid = WebPush.VapidHelper.GenerateVapidKeys();
        _factory = factory.WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["Push:PublicKey"] = vapid.PublicKey,
                ["Push:PrivateKey"] = vapid.PrivateKey,
                ["Push:Subject"] = "mailto:teste@pulsar.test",
            })));
    }

    private async Task<HttpClient> ClienteLogado()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/auth/cadastro", new CadastroRequestDto
        {
            Nome = "Push", Email = $"push_{Guid.NewGuid():N}@test.com", Senha = "Senha#2026xx",
        });
        var sessao = (await resp.Content.ReadFromJsonAsync<LoginResponseDto>(JsonOpts))!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.Token);
        return client;
    }

    private static Task<HttpResponseMessage> Inscrever(HttpClient client, string endpoint)
        => client.PostAsJsonAsync("/api/notificacoes/subscriptions",
            new AssinaturaPushRequestDto { Endpoint = endpoint, P256dh = "chave", Auth = "auth" });

    [Theory]
    [InlineData("http://169.254.169.254/latest/meta-data")]
    [InlineData("http://localhost:5245/api/admin")]
    [InlineData("https://atacante.example.com/coleta")]
    [InlineData("http://fcm.googleapis.com/fcm/send/abc")]
    [InlineData("https://fcm.googleapis.com.atacante.com/x")]
    [InlineData("nao-e-url")]
    public async Task Endpoint_ForaDosServicosDePush_EhRecusado(string endpoint)
    {
        var client = await ClienteLogado();

        (await Inscrever(client, endpoint)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData("https://fcm.googleapis.com/fcm/send/abc123")]
    [InlineData("https://updates.push.services.mozilla.com/wpush/v2/abc")]
    [InlineData("https://web.push.apple.com/QGxyz")]
    [InlineData("https://wns2-bl2p.notify.windows.com/w/?token=abc")]
    public async Task Endpoint_DeServicoDePushConhecido_EhAceito(string endpoint)
    {
        var client = await ClienteLogado();

        (await Inscrever(client, endpoint)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Endpoint_Gigante_EhRecusado()
    {
        var client = await ClienteLogado();

        var resp = await Inscrever(client, "https://fcm.googleapis.com/fcm/send/" + new string('a', 2000));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Inscricoes_AlemDoTetoPorPessoa_SaoRecusadas_MasReinscreverNaoConta()
    {
        var client = await ClienteLogado();
        for (var i = 0; i < 10; i++)
            (await Inscrever(client, $"https://fcm.googleapis.com/fcm/send/n{i}")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await Inscrever(client, "https://fcm.googleapis.com/fcm/send/n0")).StatusCode
            .Should().Be(HttpStatusCode.NoContent); // mesmo navegador de novo: atualiza
        (await Inscrever(client, "https://fcm.googleapis.com/fcm/send/n10")).StatusCode
            .Should().Be(HttpStatusCode.Conflict);
    }
}
