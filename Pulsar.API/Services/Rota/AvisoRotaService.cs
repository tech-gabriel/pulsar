using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Notificacoes;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Rota;

public class AvisoRotaService : IAvisoRotaService
{
    private readonly PulsarDbContext _db;
    private readonly IRotaService _rota;
    private readonly IPushNotificationService _push;
    private readonly ILogger<AvisoRotaService> _logger;

    public AvisoRotaService(PulsarDbContext db, IRotaService rota, IPushNotificationService push, ILogger<AvisoRotaService> logger)
    {
        _db = db;
        _rota = rota;
        _push = push;
        _logger = logger;
    }

    public async Task RegistrarAsync(Guid usuarioId, IReadOnlyList<Guid> ids, string destino, DateTime agoraUtc, CancellationToken ct = default)
    {
        await _db.PedidosAvisoRota.Where(p => p.UsuarioId == usuarioId).ExecuteDeleteAsync(ct);
        _db.PedidosAvisoRota.Add(new PedidoAvisoRota
        {
            UsuarioId = usuarioId,
            SubprefeituraIds = string.Join(',', ids),
            Destino = destino,
            CriadoEm = agoraUtc,
            ExpiraEm = agoraUtc.AddHours(LimiaresRota.ExpiracaoPedidoHoras),
        });
        await _db.SaveChangesAsync(ct);
    }

    public Task CancelarAsync(Guid usuarioId, CancellationToken ct = default)
        => _db.PedidosAvisoRota.Where(p => p.UsuarioId == usuarioId).ExecuteDeleteAsync(ct);

    public async Task<int> AvaliarEDispararAsync(DateTime agoraUtc, CancellationToken ct = default)
    {
        // Sem push não há o que avisar, e apagar o pedido tiraria o aviso de quem o pediu.
        if (!_push.Habilitado)
            return 0;

        await _db.PedidosAvisoRota.Where(p => p.ExpiraEm <= agoraUtc).ExecuteDeleteAsync(ct);
        var pedidos = await _db.PedidosAvisoRota.ToListAsync(ct);

        var enviados = 0;
        foreach (var pedido in pedidos)
        {
            try
            {
                var ids = pedido.SubprefeituraIds.Split(',').Select(Guid.Parse).ToList();
                var estado = (await _rota.AvaliarAsync(ids, ct)).Estado;
                if (estado is EstadoRota.Esperar or EstadoRota.SemDado)
                    continue;

                var corpo = estado == EstadoRota.PodeIr ? "Agora o caminho está tranquilo." : "Dá para ir, com atenção.";
                // Fora do livro-caixa do motor: é um pedido explícito, não entra no teto nem no dedup.
                // Como a pessoa pediu este aviso, vale qualquer aparelho dela: tenta cada interruptor
                // até um chegar a pelo menos um aparelho.
                var payload = new PushPayload($"O caminho até {pedido.Destino} melhorou", corpo, "/app", "rota");
                var recebeu = false;
                foreach (var criterio in new[] { CriterioOptIn.RiscoAlto, CriterioOptIn.RiscoModerado, CriterioOptIn.ResumoDiario })
                {
                    if (await _push.NotificarUsuarioAsync(pedido.UsuarioId, criterio, payload, ct) > 0)
                    {
                        recebeu = true;
                        break;
                    }
                }
                if (!recebeu)
                {
                    // Sem aparelho que receba: mantém o pedido, tenta no próximo ciclo e vence sozinho em 3 h.
                    _logger.LogInformation("Aviso de rota {Pedido} não chegou a nenhum aparelho; mantido.", pedido.Id);
                    continue;
                }

                // Se o SaveChanges falhar depois do push, o próximo ciclo manda um duplicado (aceito).
                // ExecuteDelete em vez de Remove+SaveChanges: o contexto é compartilhado e o SaveChanges
                // levaria junto qualquer outra mudança pendente.
                await _db.PedidosAvisoRota.Where(p => p.Id == pedido.Id).ExecuteDeleteAsync(ct);
                enviados++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Falha ao avaliar o aviso de rota {Pedido}.", pedido.Id);
            }
        }
        return enviados;
    }
}
