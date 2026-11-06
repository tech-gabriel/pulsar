using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Domain.Enums;
using Pulsar.API.DTOs;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;

namespace Pulsar.API.Services;

public class LocaisSalvosService : ILocaisSalvosService
{
    private readonly PulsarDbContext _db;
    private readonly ILogger<LocaisSalvosService> _logger;

    public LocaisSalvosService(PulsarDbContext db, ILogger<LocaisSalvosService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<IReadOnlyList<LocalSalvoDto>> ListarAsync(Guid usuarioId)
    {
        var locais = await _db.LocaisSalvos.AsNoTracking()
            .Include(l => l.Subprefeitura)
            .Where(l => l.UsuarioId == usuarioId)
            .OrderBy(l => l.Tipo)
            .ToListAsync();
        return locais.Select(l => new LocalSalvoDto
        {
            Tipo = l.Tipo,
            Latitude = l.Latitude,
            Longitude = l.Longitude,
            Rotulo = l.Rotulo,
            SubprefeituraId = l.SubprefeituraId,
            SubprefeituraNome = l.Subprefeitura.Nome,
        }).ToList();
    }

    public async Task<SalvarLocalResponseDto> SalvarAsync(Guid usuarioId, TipoLocal tipo, SalvarLocalRequestDto req)
    {
        var rotulo = (req.Rotulo ?? string.Empty).Trim();
        if (rotulo.Length == 0 || rotulo.Length > LocalSalvo.MaxRotulo)
            throw new ArgumentException("Endereço inválido.");
        if (!LocalSalvo.DentroDeSaoPaulo(req.Latitude, req.Longitude))
            throw new ArgumentException("Esse endereço fica fora da cidade de São Paulo.");
        var sub = await _db.Subprefeituras.AsNoTracking().FirstOrDefaultAsync(s => s.Id == req.SubprefeituraId)
            ?? throw new ArgumentException("Subprefeitura não encontrada.");

        var agora = DateTime.UtcNow;
        var local = await _db.LocaisSalvos.FirstOrDefaultAsync(l => l.UsuarioId == usuarioId && l.Tipo == tipo);
        if (local is null)
        {
            local = new LocalSalvo { UsuarioId = usuarioId, Tipo = tipo, CriadoEm = agora };
            _db.LocaisSalvos.Add(local);
        }
        local.Latitude = req.Latitude;
        local.Longitude = req.Longitude;
        local.Rotulo = rotulo;
        local.SubprefeituraId = sub.Id;
        local.AtualizadoEm = agora;

        var favoritas = await _db.UsuarioSubprefeituras.Where(f => f.UsuarioId == usuarioId)
            .Select(f => f.SubprefeituraId).ToListAsync();
        string favorita;
        if (favoritas.Contains(sub.Id))
            favorita = "JA_ERA";
        else if (favoritas.Count >= LimiaresNotificacao.MaxFavoritasPorUsuario)
            favorita = "TETO";
        else
        {
            // Insert explícito (não pela navegação do Usuario), ver IUsuarioRepository.AdicionarFavoritoAsync.
            _db.UsuarioSubprefeituras.Add(new UsuarioSubprefeitura { UsuarioId = usuarioId, SubprefeituraId = sub.Id });
            favorita = "ADICIONADA";
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Local {Tipo} salvo para o usuario {UsuarioId}", tipo, usuarioId);

        return new SalvarLocalResponseDto
        {
            Local = new LocalSalvoDto
            {
                Tipo = tipo,
                Latitude = local.Latitude,
                Longitude = local.Longitude,
                Rotulo = local.Rotulo,
                SubprefeituraId = sub.Id,
                SubprefeituraNome = sub.Nome,
            },
            Favorita = favorita,
        };
    }

    public async Task<bool> ApagarAsync(Guid usuarioId, TipoLocal tipo)
    {
        var n = await _db.LocaisSalvos.Where(l => l.UsuarioId == usuarioId && l.Tipo == tipo).ExecuteDeleteAsync();
        if (n > 0)
            _logger.LogInformation("Local {Tipo} apagado para o usuario {UsuarioId}", tipo, usuarioId);
        return n > 0;
    }
}
