using Pulsar.API.Domain.Chuva;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// As estações com chuva medida das duas redes, para toda conta que segue "a medida manda" (risco
/// por trecho, rota, aviso de casa e trabalho). O posto do CGE tem endereço desde 15/11 e manda no
/// trecho perto dele como as estações do CEMADEN. Se o CGE falhar, ficam as do CEMADEN.
/// </summary>
public static class EstacoesMedidas
{
    public static async Task<IReadOnlyList<EstacaoChuva>> TodasAsync(
        ICemadenService cemaden, IEstacaoCgeService? cge, DateTime agoraUtc, CancellationToken ct)
    {
        var doCemaden = await cemaden.ObterEstacoesComChuvaAsync(agoraUtc, ct);
        if (cge is null) return doCemaden;
        IReadOnlyList<EstacaoChuva> doCge;
        try
        {
            doCge = await cge.ObterEstacoesComChuvaAsync(agoraUtc, ct);
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            doCge = [];
        }
        return [.. doCemaden, .. doCge];
    }
}
