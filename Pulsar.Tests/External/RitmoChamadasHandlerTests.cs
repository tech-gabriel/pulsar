using System.Collections.Concurrent;
using System.Net;
using FluentAssertions;
using Pulsar.API.External.Http;

namespace Pulsar.Tests.External;

public class RitmoChamadasHandlerTests
{
    private sealed class HandlerQueAnota(ConcurrentQueue<DateTime> inicios) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            inicios.Enqueue(DateTime.UtcNow);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        }
    }

    private static HttpClient Cliente(TimeSpan intervalo, ConcurrentQueue<DateTime> inicios)
        => new(new RitmoChamadasHandler(intervalo) { InnerHandler = new HandlerQueAnota(inicios) }) { BaseAddress = new Uri("http://teste/") };

    // 41 áreas mais a previsão na hora cheia estouravam o teto de 60 chamadas por minuto do
    // OpenWeatherMap: o intervalo mínimo entre saídas é o que segura o ritmo.
    [Fact]
    public async Task TresChamadasConcorrentes_RespeitamOIntervalo()
    {
        var inicios = new ConcurrentQueue<DateTime>();
        var http = Cliente(TimeSpan.FromMilliseconds(100), inicios);

        await Task.WhenAll(http.GetAsync("a"), http.GetAsync("b"), http.GetAsync("c"));

        // O horário anotado aqui é o do handler de dentro, que pode atrasar alguns ms por
        // agendamento de thread e encurtar o intervalo seguinte na medição. O total das três
        // compensa esse atraso; sem o ritmo, as três saem juntas (total perto de zero).
        var ordem = inicios.OrderBy(t => t).ToList();
        ordem.Should().HaveCount(3);
        (ordem[2] - ordem[0]).Should().BeGreaterThanOrEqualTo(TimeSpan.FromMilliseconds(190));
        (ordem[1] - ordem[0]).Should().BeGreaterThanOrEqualTo(TimeSpan.FromMilliseconds(60));
        (ordem[2] - ordem[1]).Should().BeGreaterThanOrEqualTo(TimeSpan.FromMilliseconds(60));
    }

    // Uma chamada cancelada enquanto espera a vez não pode prender as seguintes.
    [Fact]
    public async Task ChamadaCanceladaNaEspera_NaoPrendeAFila()
    {
        var inicios = new ConcurrentQueue<DateTime>();
        var http = Cliente(TimeSpan.FromMilliseconds(300), inicios);
        await http.GetAsync("primeira");

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));
        var cancelada = () => http.GetAsync("segunda", cts.Token);
        await cancelada.Should().ThrowAsync<OperationCanceledException>();

        var terceira = await http.GetAsync("terceira");
        terceira.StatusCode.Should().Be(HttpStatusCode.OK);
        inicios.Should().HaveCount(2);
    }
}
