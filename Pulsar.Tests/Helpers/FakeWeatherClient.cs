using Pulsar.API.DTOs;
using Pulsar.API.External.Interfaces;

namespace Pulsar.Tests.Helpers;

/// <summary>
/// Cliente de clima determinístico para testes — não faz chamadas de rede.
/// Permite testar a coleta manual (POST /api/admin/sistema/coletar) offline.
/// </summary>
public class FakeWeatherClient : IWeatherClient
{
    public Task<DadosClimaticosDto> ObterDadosAsync(double latitude, double longitude, CancellationToken ct = default)
        => Task.FromResult(new DadosClimaticosDto
        {
            ChuvaMmH = 1.0,
            VentoKmH = 10.0,
            VisibilidadeKm = 10.0,
            IndiceUv = 2.0,
            TemperaturaC = 22.0,
            SensacaoTermica = 22.0,
            Umidade = 60.0,
            Timestamp = DateTime.UtcNow
        });
}
