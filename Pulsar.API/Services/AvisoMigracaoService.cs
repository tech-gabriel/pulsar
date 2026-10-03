using System.Net;
using Microsoft.EntityFrameworkCore;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services;

/// <summary>
/// Aviso único do SP1: favoritos de zona foram zerados e quem não abrir o app perderia o
/// alerta sem saber. Push e e-mail são marcados SEPARADAMENTE e só depois de concluir, por
/// pessoa: reinício no meio continua de onde parou e não repete quem já foi avisado.
/// </summary>
public class AvisoMigracaoService : IAvisoMigracaoService
{
    private const string Titulo = "O Pulsar agora avisa por subprefeitura";

    private readonly PulsarDbContext _db;
    private readonly IPushNotificationService _push;
    private readonly IEmailSender _email;
    private readonly ILogger<AvisoMigracaoService> _logger;

    public AvisoMigracaoService(PulsarDbContext db, IPushNotificationService push, IEmailSender email, ILogger<AvisoMigracaoService> logger)
    {
        _db = db;
        _push = push;
        _email = email;
        _logger = logger;
    }

    public async Task<int> ProcessarPendentesAsync(CancellationToken ct = default)
    {
        var pendentes = await _db.MigracoesFavoritoZona
            .Include(m => m.Regiao)
            .Include(m => m.Usuario)
            .Where(m => m.PushAvisadoEm == null || m.EmailAvisadoEm == null)
            .ToListAsync(ct);

        var processadas = 0;
        foreach (var g in pendentes.GroupBy(m => m.UsuarioId))
        {
            if (ct.IsCancellationRequested) break;
            var linhas = g.ToList();
            var usuario = linhas[0].Usuario;
            // Ordenadas: sem isso o texto dependeria da ordem em que o banco devolve as linhas.
            var zonas = ZonasPorExtenso([.. linhas.Select(l => l.Regiao.Nome).Distinct().Order()]);
            var texto = $"Você acompanhava {zonas}. Escolha suas subprefeituras para continuar recebendo alertas.";
            var agora = DateTime.UtcNow;

            if (linhas.Any(l => l.PushAvisadoEm is null))
            {
                try
                {
                    // Sem aparelho, devolve 0: não há o que mandar, conta como avisado.
                    await _push.NotificarUsuarioAsync(g.Key, CriterioOptIn.RiscoAlto,
                        new PushPayload(Titulo, texto, Url: "/app", Tag: "aviso-migracao"), ct);
                    foreach (var l in linhas) l.PushAvisadoEm = agora;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha no push do aviso de migração para {UsuarioId}.", g.Key);
                }
            }

            if (linhas.Any(l => l.EmailAvisadoEm is null))
            {
                try
                {
                    await _email.EnviarAsync(usuario.Email, Titulo, MontarHtml(usuario.Nome, texto), ct);
                    foreach (var l in linhas) l.EmailAvisadoEm = agora;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha no e-mail do aviso de migração para {UsuarioId}.", g.Key);
                }
            }

            await _db.SaveChangesAsync(ct);
            processadas++;
        }
        return processadas;
    }

    private static string ZonasPorExtenso(IReadOnlyList<string> zonas) => zonas.Count == 1
        ? $"a zona {zonas[0]}"
        : $"as zonas {string.Join(", ", zonas.Take(zonas.Count - 1))} e {zonas[^1]}";

    private static string MontarHtml(string nome, string texto)
        => $"<p>Olá, {WebUtility.HtmlEncode(nome)}.</p>" +
           $"<p>{Titulo}: agora você escolhe exatamente os lugares que acompanha, como casa e trabalho.</p>" +
           $"<p>{WebUtility.HtmlEncode(texto)}</p>" +
           "<p><a href=\"https://app-pulsar.com.br/app\">Escolher minhas subprefeituras</a></p>";
}
