using Pulsar.API.Domain.Alertas;

namespace Pulsar.API.External.Interfaces;

public interface IIdapClient
{
    /// <summary>Alertas do feed nacional da Defesa Civil; null quando o feed falhou (rede, HTTP, XML).</summary>
    Task<IReadOnlyList<AlertaCap>?> ObterAsync(CancellationToken ct = default);
}
