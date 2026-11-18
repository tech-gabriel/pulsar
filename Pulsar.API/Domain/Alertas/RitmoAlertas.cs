using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Domain.Alertas;

/// <summary>
/// De quanto em quanto tempo ler o feed da Defesa Civil (decisão do user, 18/11/2026). Cada leitura
/// baixa ~13,6 MB (sem gzip nem cache), então a cada 5 min só quando há algo acontecendo: alerta
/// valendo numa área do Pulsar, alerta de SP no feed ou chuva medida. No resto, a cada 15 min.
/// Feed fora do ar também fica nos 15 min: insistir só gasta banda.
/// </summary>
public static class RitmoAlertas
{
    public static readonly TimeSpan Atento = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan Calmo = TimeSpan.FromMinutes(15);

    public static TimeSpan Proximo(ResultadoSincronizacao ultima, bool haAlertaAtivoNasAreas, bool haChuvaMedida)
        => ultima.Ok && (haAlertaAtivoNasAreas || ultima.HaAlertaSp || haChuvaMedida) ? Atento : Calmo;
}
