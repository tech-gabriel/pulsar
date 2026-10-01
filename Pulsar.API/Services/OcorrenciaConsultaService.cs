using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class OcorrenciaConsultaService : IOcorrenciaConsultaService
{
    private readonly IOcorrenciaAlagamentoRepository _repo;
    private readonly ISubprefeituraRepository _subRepo;
    private readonly IScoreRepository _scoreRepo;

    public OcorrenciaConsultaService(
        IOcorrenciaAlagamentoRepository repo,
        ISubprefeituraRepository subRepo,
        IScoreRepository scoreRepo)
    {
        _repo = repo;
        _subRepo = subRepo;
        _scoreRepo = scoreRepo;
    }

    public async Task<IReadOnlyList<OcorrenciaAlagamentoDto>> ObterRecentesAsync()
    {
        var recentes = await _repo.ObterRecentesAsync(12);
        return recentes.Select(o => new OcorrenciaAlagamentoDto
        {
            Id = o.Id,
            Tipo = o.Tipo,
            DataOcorrencia = o.DataOcorrencia,
            Latitude = o.Latitude,
            Longitude = o.Longitude,
            NmSubprefeitura = o.NmSubprefeitura,
        }).ToList();
    }

    public async Task<OcorrenciasProximasDto> ObterProximasAsync(double lat, double lon, int raioMetros)
    {
        var recentes = await _repo.ObterRecentesAsync(12);
        var noRaio = recentes
            .Select(o => new { Oco = o, Metros = GeoDistancia.HaversineMetros(lat, lon, o.Latitude, o.Longitude) })
            .Where(x => x.Metros <= raioMetros)
            .ToList();

        var dto = new OcorrenciasProximasDto
        {
            Total = noRaio.Count,
            Alagamentos = noRaio.Count(x => x.Oco.Tipo == TipoOcorrenciaAlagamento.ALAGAMENTO),
            Inundacoes = noRaio.Count(x => x.Oco.Tipo == TipoOcorrenciaAlagamento.INUNDACAO),
            MaisProximaMetros = noRaio.Count > 0 ? noRaio.Min(x => x.Metros) : null,
        };

        // Fase B: risco elevado = há ocorrência no raio E a subprefeitura mais próxima
        // (por centróide) está com alagamento MODERADO ou pior. Uma noção só de risco no app.
        if (noRaio.Count > 0)
        {
            var maisProxima = await SubprefeituraMaisProximaAsync(lat, lon);
            if (maisProxima is not null)
            {
                var comLeitura = await _subRepo.ObterComUltimaLeituraAsync(maisProxima.Id);
                dto.ChuvaMmH = comLeitura?.GetUltimaLeitura()?.ChuvaMmH;
                var score = await _scoreRepo.ObterUltimoAsync(maisProxima.Id);
                dto.RiscoElevado = score is not null && score.FaixaAlagamento >= FaixaRisco.MODERADO;
            }
        }

        return dto;
    }

    private async Task<Subprefeitura?> SubprefeituraMaisProximaAsync(double lat, double lon)
    {
        var ativas = await _subRepo.ObterAtivasAsync();
        return ativas
            .OrderBy(s => GeoDistancia.HaversineMetros(lat, lon, s.Latitude, s.Longitude))
            .FirstOrDefault();
    }
}
