using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.External.Interfaces;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services;

/// <summary>
/// Traz os pontos de alagamento do CGE-SP para o banco, uma vez por ciclo de coleta. O motor
/// de notificações e o mapa leem daqui, nunca da página: assim uma queda do CGE não derruba
/// nada, só deixa os pontos envelhecerem até deixarem de valer (ver PontoAlagamentoCge.VistoEm).
/// </summary>
public class AlagamentoCgeService : IAlagamentoCgeService
{
    private readonly PulsarDbContext _db;
    private readonly ICgeAlagamentoClient _client;
    private readonly ILogger<AlagamentoCgeService> _logger;

    public AlagamentoCgeService(PulsarDbContext db, ICgeAlagamentoClient client, ILogger<AlagamentoCgeService> logger)
    {
        _db = db;
        _client = client;
        _logger = logger;
    }

    public async Task AtualizarAsync(CancellationToken ct = default)
    {
        var subs = await _db.Subprefeituras.Include(s => s.Regiao).Where(s => s.Ativa).ToListAsync(ct);
        if (subs.Count == 0) return;

        // ponytail: o CGE só cobre São Paulo, então o fuso é o da primeira região. Outra
        // cidade traz outra fonte, e aí o fuso vem dela.
        var tz = TimeZoneInfo.FindSystemTimeZoneById(subs[0].Regiao.FusoHorario);
        var agora = DateTime.UtcNow;
        var dia = FusoLocal.DiaLocal(agora, tz);

        var brutos = await _client.ObterDoDiaAsync(dia, ct);
        var existentes = await _db.PontosAlagamentoCge.Where(p => p.Dia == dia).ToListAsync(ct);

        foreach (var b in brutos)
        {
            var sub = Casar(b.NomeSubprefeitura, subs);
            if (sub is null)
            {
                // Nunca vira push: um nome novo do CGE só fica sem aviso até alguém casar.
                _logger.LogWarning("Subprefeitura do CGE sem correspondência: {Nome}.", b.NomeSubprefeitura);
                continue;
            }

            var inicio = ParaUtc(dia, b.Inicio, tz);
            var ponto = existentes.FirstOrDefault(p => p.SubprefeituraId == sub.Id && p.InicioUtc == inicio
                && p.Via == b.Via && p.Sentido == b.Sentido && p.Referencia == b.Referencia);
            if (ponto is null)
            {
                ponto = new PontoAlagamentoCge
                {
                    SubprefeituraId = sub.Id, Dia = dia, InicioUtc = inicio,
                    Via = b.Via, Sentido = b.Sentido, Referencia = b.Referencia,
                };
                _db.PontosAlagamentoCge.Add(ponto);
                existentes.Add(ponto);
            }

            ponto.FimUtc = b.Fim is { } fim ? ParaUtc(dia, fim, tz) : null;
            ponto.Ativo = b.Ativo;
            ponto.Transitavel = b.Transitavel;
            ponto.VistoEm = agora;
        }

        await _db.SaveChangesAsync(ct);
    }

    private static DateTime ParaUtc(DateOnly dia, TimeOnly hora, TimeZoneInfo tz)
        => TimeZoneInfo.ConvertTimeToUtc(dia.ToDateTime(hora), tz);

    /// <summary>
    /// O CGE escreve "Pirituba/Jaraguá", "São Miguel Paulista", "Vila Maria/ Vila Guilherme";
    /// o Pulsar, "Pirituba-Jaraguá", "São Miguel", "Vila Maria-Vila Guilherme". Compara o
    /// primeiro trecho sem acento e sem caixa; "começa com" cobre o "Paulista" a mais. O espaço
    /// no "começa com" impede "Vila Mariana" de casar com "Vila Maria".
    /// </summary>
    public static Subprefeitura? Casar(string nomeCge, IEnumerable<Subprefeitura> subs)
    {
        var alvo = PrimeiroTrecho(nomeCge);
        if (alvo.Length == 0) return null;
        return subs.FirstOrDefault(s => PrimeiroTrecho(s.Nome) == alvo)
            ?? subs.FirstOrDefault(s => alvo.StartsWith(PrimeiroTrecho(s.Nome) + " ", StringComparison.Ordinal));
    }

    private static string PrimeiroTrecho(string nome)
    {
        var semAcento = new string(nome.Normalize(NormalizationForm.FormD)
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .ToArray()).Normalize(NormalizationForm.FormC);
        return semAcento.Split('/', '-')[0].Replace("'", "").Trim().ToLowerInvariant();
    }
}
