using Pulsar.API.Domain.Entities;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class ClimateService : IClimateService
{
    private readonly IWeatherClient _weatherClient;
    private readonly ISubprefeituraRepository _subprefeituraRepo;
    private readonly ILeituraRepository _leituraRepo;
    private readonly ILogger<ClimateService> _logger;

    public ClimateService(
        IWeatherClient weatherClient,
        ISubprefeituraRepository subprefeituraRepo,
        ILeituraRepository leituraRepo,
        ILogger<ClimateService> logger)
    {
        _weatherClient = weatherClient;
        _subprefeituraRepo = subprefeituraRepo;
        _leituraRepo = leituraRepo;
        _logger = logger;
    }

    public async Task ColetarDadosAsync(Guid subprefeituraId, CancellationToken ct = default)
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
            Timestamp = dados.Timestamp
        };

        await _leituraRepo.AdicionarAsync(leitura);
        await _leituraRepo.LimparHistoricoAntigoAsync(subprefeituraId);
        await _leituraRepo.SalvarAsync();
    }

    public async Task ColetarTodasAsync(CancellationToken ct = default)
    {
        var subprefeituras = await _subprefeituraRepo.ObterAtivasAsync();

        foreach (var subprefeitura in subprefeituras)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                await ColetarDadosAsync(subprefeitura.Id, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao coletar dados da subprefeitura {Nome} ({Id}). Continuando.",
                    subprefeitura.Nome, subprefeitura.Id);
            }
        }
    }
}
