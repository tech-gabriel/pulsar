using FluentAssertions;
using Pulsar.API.External.Clients;

namespace Pulsar.Tests.External;

// O UV vem do "agora" do Open-Meteo, não do pico do dia da OpenWeatherMap.
public class UvAtualTests
{
    [Theory]
    [InlineData("""{"current":{"time":"2026-11-15T23:45","interval":900,"uv_index":0.0}}""", 0)]
    [InlineData("""{"current":{"uv_index":7.35}}""", 7.35)]
    [InlineData("""{"current":{"uv_index":null}}""", 0)]
    [InlineData("""{"error":true}""", 0)]
    public void UvAtual_LeOCampoDeAgora(string json, double esperado)
        => OpenWeatherMapClient.UvAtual(json).Should().Be(esperado);
}
