using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IOcorrenciaConsultaService
{
    /// <summary>Ocorrências dos últimos 12 meses para o mapa.</summary>
    Task<IReadOnlyList<OcorrenciaAlagamentoDto>> ObterRecentesAsync();

    /// <summary>Resumo das ocorrências dentro do raio + risco elevado conforme a chuva atual.</summary>
    Task<OcorrenciasProximasDto> ObterProximasAsync(double lat, double lon, int raioMetros);
}
