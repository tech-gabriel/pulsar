using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

public class SistemaService : ISistemaService
{
    // Mesmo intervalo do DataCollectionJob; exibido no painel.
    private const int IntervaloColetaMinutos = 15;

    private readonly PulsarDbContext _db;
    private readonly IColetaRunner _coletaRunner;

    public SistemaService(PulsarDbContext db, IColetaRunner coletaRunner)
    {
        _db = db;
        _coletaRunner = coletaRunner;
    }

    public async Task<SistemaStatusDto> ObterStatusAsync()
    {
        var limite24h = DateTime.UtcNow.AddHours(-24);

        var subs = await _db.Subprefeituras
            .Where(s => s.Ativa)
            .Select(s => new { s.Id, s.Nome })
            .ToListAsync();

        var ultimasPorSub = await _db.LeiturasClimaticas
            .GroupBy(l => l.SubprefeituraId)
            .Select(g => new { SubId = g.Key, Ultima = g.Max(l => l.CriadoEm) })
            .ToListAsync();
        var mapa = ultimasPorSub.ToDictionary(x => x.SubId, x => x.Ultima);

        var lista = subs
            .Select(s => new SubprefeituraStatusDto
            {
                Nome = s.Nome,
                UltimaLeitura = mapa.TryGetValue(s.Id, out var u) ? u : null
            })
            .OrderBy(s => s.Nome)
            .ToList();

        return new SistemaStatusDto
        {
            SubprefeiturasAtivas = subs.Count,
            SubprefeiturasComLeitura = lista.Count(x => x.UltimaLeitura is not null),
            UltimaColeta = ultimasPorSub.Count > 0 ? ultimasPorSub.Max(x => x.Ultima) : null,
            LeiturasUltimas24h = await _db.LeiturasClimaticas.CountAsync(l => l.CriadoEm >= limite24h),
            IntervaloColetaMinutos = IntervaloColetaMinutos,
            Subprefeituras = lista
        };
    }

    public async Task<MetricasDto> ObterMetricasAsync()
    {
        var limite24h = DateTime.UtcNow.AddHours(-24);

        return new MetricasDto
        {
            TotalUsuarios = await _db.Usuarios.CountAsync(),
            UsuariosAtivos = await _db.Usuarios.CountAsync(u => u.Ativo),
            Admins = await _db.Usuarios.CountAsync(u => u.Role == RoleAcesso.ADMIN),
            Suportes = await _db.Usuarios.CountAsync(u => u.Role == RoleAcesso.SUPORTE),
            TotalSugestoes = await _db.Sugestoes.CountAsync(),
            SugestoesAtivas = await _db.Sugestoes.CountAsync(s => s.Ativa),
            AlertasUltimas24h = await _db.Alertas.CountAsync(a => a.CriadoEm >= limite24h),
            LeiturasUltimas24h = await _db.LeiturasClimaticas.CountAsync(l => l.CriadoEm >= limite24h)
        };
    }

    public async Task<ColetaResultadoDto> ForcarColetaAsync(CancellationToken ct = default)
    {
        var r = await _coletaRunner.ExecutarCicloAsync(ct);
        return new ColetaResultadoDto
        {
            SubprefeiturasProcessadas = r.SubprefeiturasProcessadas,
            ScoresCalculados = r.ScoresCalculados,
            AlertasGerados = r.AlertasGerados,
            ConcluidoEm = r.ConcluidoEm
        };
    }
}
