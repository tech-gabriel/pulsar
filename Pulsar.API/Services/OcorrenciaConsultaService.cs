using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class OcorrenciaConsultaService : IOcorrenciaConsultaService
{
    // Limiar de chuva alinhado ao "risco de alagamentos" do catálogo (utils/sugestoes.ts front).
    private const double ChuvaLimiarMmH = 5.0;

    private readonly IOcorrenciaAlagamentoRepository _repo;
    private readonly ISubprefeituraRepository _subRepo;

    public OcorrenciaConsultaService(
        IOcorrenciaAlagamentoRepository repo,
        ISubprefeituraRepository subRepo)
    {
        _repo = repo;
        _subRepo = subRepo;
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

        // Fase B: risco elevado = há ocorrência no raio E chuva atual acima do limiar
        // na subprefeitura mais próxima (por centróide).
        if (noRaio.Count > 0)
        {
            var chuva = await ChuvaNaSubprefeituraMaisProximaAsync(lat, lon);
            dto.ChuvaMmH = chuva;
            dto.RiscoElevado = chuva.HasValue && chuva.Value > ChuvaLimiarMmH;
        }

        return dto;
    }

    private async Task<double?> ChuvaNaSubprefeituraMaisProximaAsync(double lat, double lon)
    {
        var ativas = await _subRepo.ObterAtivasAsync();
        var maisProxima = ativas
            .Select(s => new { Sub = s, Metros = GeoDistancia.HaversineMetros(lat, lon, s.Latitude, s.Longitude) })
            .OrderBy(x => x.Metros)
            .FirstOrDefault();
        if (maisProxima is null)
            return null;

        var comLeitura = await _subRepo.ObterComUltimaLeituraAsync(maisProxima.Sub.Id);
        return comLeitura?.GetUltimaLeitura()?.ChuvaMmH;
    }
}
