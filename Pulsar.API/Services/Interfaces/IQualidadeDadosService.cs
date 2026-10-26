using Pulsar.API.DTOs;

namespace Pulsar.API.Services.Interfaces;

public interface IQualidadeDadosService
{
    /// <summary>Os últimos <paramref name="dias"/> dias locais por subprefeitura, com os avisos já calculados.</summary>
    Task<QualidadeDadosDto> ObterAsync(int dias, CancellationToken ct = default);
}
