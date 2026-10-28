using Pulsar.API.Domain.Entities;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class ClimateService : IClimateService
{
    private readonly IWeatherClient _weatherClient;
    private readonly IChuvaReferenciaClient _chuvaReferencia;
    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly ILeituraRepository _leituraRepo;
    private readonly ILogger<ClimateService> _logger;

    public ClimateService(
        IWeatherClient weatherClient,
        IChuvaReferenciaClient chuvaReferencia,
        ISubprefeituraRepository subprefeituraRepo,
        ILeituraRepository leituraRepo,
        ILogger<ClimateService> logger)
    {
        _weatherClient = weatherClient;
        _chuvaReferencia = chuvaReferencia;
        _subprefeituraRepo = subprefeituraRepo;
        _leituraRepo = leituraRepo;
        _logger = logger;
    }

    public Task ColetarDadosAsync(Guid subprefeituraId, CancellationToken ct = default)
        => ColetarDadosAsync(subprefeituraId, null, ct);

    private async Task ColetarDadosAsync(Guid subprefeituraId, IReadOnlyDictionary<DateTime, double>? referencia, CancellationToken ct)
    {
        var subprefeitura = await _subprefeituraRepo.ObterPorIdAsync(subprefeituraId)
            ?? throw new InvalidOperationException($"Subprefeitura {subprefeituraId} não encontrada.");

        var dados = await _weatherClient.ObterDadosAsync(subprefeitura.Latitude, subprefeitura.Longitude, ct);

        var leitura = new LeituraClimatica
        {
            SubprefeituraId = subprefeituraId,
            ChuvaMmH = dados.ChuvaMmH,
            VentoKmH = dados.VentoKmH,
            VisibilidadeKm = dados.VisibilidadeKm > 0 ? dados.VisibilidadeKm : 10.0,
            IndiceUv = dados.IndiceUv,
            TemperaturaC = dados.TemperaturaC,
            SensacaoTermica = dados.SensacaoTermica,
            Umidade = dados.Umidade,
            Timestamp = dados.Timestamp
        };

        if (referencia is not null && dados.ChuvaMmH > 0)
            await ConferirChuvaAsync(leitura, subprefeitura.Nome, referencia);

        await _leituraRepo.AdicionarAsync(leitura);
        await _leituraRepo.LimparHistoricoAntigoAsync(subprefeituraId);
        await _leituraRepo.SalvarAsync();
    }

    private async Task ConferirChuvaAsync(LeituraClimatica leitura, string nome, IReadOnlyDictionary<DateTime, double> referencia)
    {
        // A soma usa o valor cru: com o corrigido ela cairia abaixo do mínimo e a leitura
        // seguinte voltaria a passar.
        var anteriores = await _leituraRepo.ObterHistoricoAsync(leitura.SubprefeituraId, PlausibilidadeChuva.JanelaHoras);
        var cruas = anteriores.Select(l => (l.Timestamp, l.ChuvaBrutaMmH ?? l.ChuvaMmH))
            .Append((leitura.Timestamp, leitura.ChuvaMmH));

        if (!PlausibilidadeChuva.Implausivel(cruas, leitura.Timestamp, referencia)) return;

        leitura.ChuvaBrutaMmH = leitura.ChuvaMmH;
        leitura.ChuvaMmH = PlausibilidadeChuva.Substituta(leitura.Timestamp, referencia);
        _logger.LogWarning(
            "Chuva implausível do OpenWeatherMap em {Nome}: {Bruta} mm/h trocado por {Corrigida} mm/h (Open-Meteo).",
            nome, leitura.ChuvaBrutaMmH, leitura.ChuvaMmH);
    }

    public async Task ColetarTodasAsync(CancellationToken ct = default)
    {
        var subprefeituras = (await _subprefeituraRepo.ObterAtivasAsync()).ToList();
        var referencias = await ObterReferenciasAsync(subprefeituras, ct);

        for (var i = 0; i < subprefeituras.Count; i++)
        {
            if (ct.IsCancellationRequested) break;
            var subprefeitura = subprefeituras[i];

            try
            {
                await ColetarDadosAsync(subprefeitura.Id, referencias?[i], ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao coletar dados da subprefeitura {Nome} ({Id}). Continuando.",
                    subprefeitura.Nome, subprefeitura.Id);
            }
        }
    }

    /// <summary>
    /// Sem a segunda fonte, a coleta segue sem a conferência: num app de alerta, perder uma
    /// chuva real por falta de prova é pior do que deixar passar uma falsa.
    /// </summary>
    private async Task<IReadOnlyList<IReadOnlyDictionary<DateTime, double>>?> ObterReferenciasAsync(
        IReadOnlyList<Subprefeitura> subprefeituras, CancellationToken ct)
    {
        try
        {
            var series = await _chuvaReferencia.ObterHorariaAsync(
                subprefeituras.Select(s => (s.Latitude, s.Longitude)).ToList(), ct);
            return series.Count == subprefeituras.Count ? series : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Open-Meteo indisponível. Coleta segue sem conferir a chuva.");
            return null;
        }
    }
}
