using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;
using Pulsar.API.Services.Push;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Onde a decisão de push acontece, em duas etapas. Etapa 1 (gerar): os gatilhos rodam por
/// subprefeitura acompanhada por alguém e devolvem candidatos. Etapa 2 (consolidar): o
/// <see cref="Consolidador"/> decide, por pessoa, UM push por ciclo (dedup, prioridade, teto
/// diário com risco alto isento). Depois envia e registra no livro-caixa por pessoa.
///
/// Toda a encanação vive aqui, e é isso que deixa os gatilhos sem banco, sem push e sem
/// preferência de usuário (ver <see cref="IGatilhoNotificacao"/>).
///
/// Resiliência é regra e não detalhe: cada subprefeitura tem seu try/catch (o fuso de texto
/// livre é resolvido na montagem do contexto), cada gatilho tem o seu, e cada pessoa tem o seu
/// no envio. Um gatilho informativo quebrado ou um fuso digitado errado não calam o aviso de
/// risco alto das outras subprefeituras nem das outras pessoas.
/// </summary>
public class MotorNotificacoes : IMotorNotificacoes
{
    private readonly PulsarDbContext _db;
    private readonly INotificacaoEnviadaRepository _livroCaixa;
    private readonly IPrevisaoService _previsaoService;
    private readonly IPushNotificationService _push;
    private readonly IEnumerable<IGatilhoNotificacao> _gatilhos;
    private readonly ILogger<MotorNotificacoes> _logger;

    public MotorNotificacoes(
        PulsarDbContext db,
        INotificacaoEnviadaRepository livroCaixa,
        IPrevisaoService previsaoService,
        IPushNotificationService push,
        IEnumerable<IGatilhoNotificacao> gatilhos,
        ILogger<MotorNotificacoes> logger)
    {
        _db = db;
        _livroCaixa = livroCaixa;
        _previsaoService = previsaoService;
        _push = push;
        _gatilhos = gatilhos;
        _logger = logger;
    }

    public async Task<int> AvaliarEDispararAsync(CancellationToken ct = default)
    {
        // Sem chaves VAPID nada sai, então avaliar gatilhos e escrever no livro-caixa seria
        // pior que inútil: gravaria a chave de um push que não aconteceu e calaria o aviso de
        // verdade no dia em que o push fosse ligado.
        if (!_push.Habilitado)
            return 0;

        // Um instante só para o ciclo inteiro: a chave do briefing é o dia local, e reler o
        // relógio no meio faria subprefeituras avaliarem calendários diferentes na virada.
        var agora = DateTime.UtcNow;
        var enviadosTotal = 0;

        var destinatarios = await MontarDestinatariosAsync(agora, ct);
        if (destinatarios.Count > 0)
        {
            var pendencias = await GerarPendenciasAsync(
                destinatarios.SelectMany(d => d.Favoritas).ToHashSet(), agora, ct);

            // Lista pela metade decide errado: o gatilho que não chegou a rodar pode ser o de
            // risco alto, e a pendência menor sairia por AUSÊNCIA da maior. Nada foi enviado
            // nem gravado até aqui, então largar o ciclo é de graça: o próximo reavalia tudo.
            if (ct.IsCancellationRequested) return 0;

            foreach (var d in destinatarios)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    enviadosTotal += await EnviarAsync(d, pendencias, agora, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha ao notificar o usuário {UsuarioId}.", d.UsuarioId);
                }
            }
        }

        // Retenção aqui e não num job noturno: este é o único lugar que já roda a cada ciclo e
        // conhece o livro-caixa. try/catch próprio porque limpeza falhando não pode mascarar o
        // número de push que realmente saiu.
        try
        {
            var removidos = await _livroCaixa.RemoverAntigasAsync(
                agora.AddDays(-LimiaresNotificacao.RetencaoLivroCaixaDias));
            if (removidos > 0)
                _logger.LogInformation("{Total} registro(s) antigo(s) de notificação removido(s).", removidos);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha na retenção do livro-caixa de notificações.");
        }

        return enviadosTotal;
    }

    /// <summary>Pessoas com favoritas ativas E algum aparelho com preferência ligada.</summary>
    private async Task<List<DestinatarioPush>> MontarDestinatariosAsync(DateTime agora, CancellationToken ct)
    {
        var favoritas = await _db.UsuarioSubprefeituras
            .Where(f => f.Subprefeitura.Ativa)
            .Select(f => new { f.UsuarioId, f.SubprefeituraId, Fuso = f.Subprefeitura.Regiao.FusoHorario })
            .ToListAsync(ct);
        if (favoritas.Count == 0) return [];

        var usuarios = favoritas.Select(f => f.UsuarioId).Distinct().ToList();
        var aparelhos = await _db.AssinaturasPush.Where(a => usuarios.Contains(a.UsuarioId)).ToListAsync(ct);
        var recentes = await _livroCaixa.ObterRecentesAsync(usuarios, LimiaresNotificacao.JanelaTetoDiarioHoras);

        var lista = new List<DestinatarioPush>();
        foreach (var g in favoritas.GroupBy(f => f.UsuarioId))
        {
            var criterios = aparelhos
                .Where(a => a.UsuarioId == g.Key)
                .SelectMany(a => Enum.GetValues<CriterioOptIn>().Where(c => WebPushNotificationService.OptouPeloCriterio(a, c)))
                .ToHashSet();
            // Sem aparelho com preferência ligada não há o que decidir, nem o que gravar.
            if (criterios.Count == 0) continue;

            // ponytail: fuso da pessoa = fuso da zona da primeira favorita; hoje tudo é SP.
            // Com a segunda cidade, decidir entre fuso do aparelho ou teto por fuso.
            var idFuso = g.First().Fuso;
            TimeZoneInfo fuso;
            try
            {
                fuso = TimeZoneInfo.FindSystemTimeZoneById(idFuso);
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                _logger.LogError(ex,
                    "Fuso horário inválido ({Fuso}) para o usuário {UsuarioId}: ele não recebe " +
                    "notificação enquanto o valor não for corrigido.", idFuso, g.Key);
                continue;
            }

            lista.Add(new DestinatarioPush(
                g.Key,
                g.Select(f => f.SubprefeituraId).ToHashSet(),
                criterios,
                recentes.Where(r => r.UsuarioId == g.Key)
                        .Select(r => new EnvioAnterior(r.SubprefeituraId, r.Gatilho, r.Chave, r.EnvioId, r.EnviadoEm))
                        .ToList(),
                fuso));
        }
        return lista;
    }

    /// <summary>Etapa 1: roda os gatilhos em cada subprefeitura acompanhada por alguém.</summary>
    private async Task<List<NotificacaoPendente>> GerarPendenciasAsync(
        HashSet<Guid> subIds, DateTime agora, CancellationToken ct)
    {
        var subs = await _db.Subprefeituras
            .Include(s => s.Regiao)
            .Where(s => subIds.Contains(s.Id) && s.Ativa)
            .ToListAsync(ct);

        var pendencias = new List<NotificacaoPendente>();
        foreach (var sub in subs)
        {
            if (ct.IsCancellationRequested) break;

            ContextoGatilho ctx;
            try
            {
                ctx = await MontarContextoAsync(sub, agora, ct);
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                // Mensagem própria: fuso é texto livre na Regiao, e enquanto não for corrigido
                // esta subprefeitura não notifica NUNCA. Diluído num aviso genérico, vira ruído.
                _logger.LogError(ex,
                    "Fuso horário inválido na subprefeitura {Nome}: {Fuso}. Enquanto o valor não for " +
                    "corrigido, ela não gera notificação nenhuma.", sub.Nome, sub.Regiao.FusoHorario);
                continue;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao montar o contexto da subprefeitura {Nome}.", sub.Nome);
                continue;
            }

            foreach (var gatilho in _gatilhos)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    pendencias.AddRange(await gatilho.AvaliarAsync(ctx, ct));
                }
                catch (Exception ex)
                {
                    // try/catch POR GATILHO é contrato de IGatilhoNotificacao: um gatilho
                    // informativo quebrado não cala o aviso de risco alto.
                    _logger.LogWarning(ex, "Gatilho {Gatilho} falhou na subprefeitura {Nome}.", gatilho.Nome, sub.Nome);
                }
            }
        }
        return pendencias;
    }

    private async Task<ContextoGatilho> MontarContextoAsync(Subprefeitura sub, DateTime agora, CancellationToken ct)
    {
        var score = await _db.ScoresPerigo
            .Where(s => s.SubprefeituraId == sub.Id)
            .OrderByDescending(s => s.Timestamp)
            .FirstOrDefaultAsync(ct);
        var leitura = await _db.LeiturasClimaticas
            .Where(l => l.SubprefeituraId == sub.Id)
            .OrderByDescending(l => l.Timestamp)
            .FirstOrDefaultAsync(ct);

        return new ContextoGatilho
        {
            Estado = new EstadoSubprefeitura(sub, score, leitura),
            // Texto livre vindo do banco: um typo lança aqui (catch próprio em GerarPendenciasAsync).
            Fuso = TimeZoneInfo.FindSystemTimeZoneById(sub.Regiao.FusoHorario),
            Previsao = await _previsaoService.ObterFaixasSubprefeituraAsync(sub.Id, LimiaresNotificacao.MaxFaixasContexto, ct),
            AgoraUtc = agora,
        };
    }

    /// <summary>Etapa 2 + envio + registro. Devolve quantos aparelhos receberam.</summary>
    private async Task<int> EnviarAsync(
        DestinatarioPush d, IReadOnlyList<NotificacaoPendente> pendencias, DateTime agora, CancellationToken ct)
    {
        var envio = Consolidador.Consolidar(d, pendencias, agora);
        if (envio is null) return 0;

        var enviados = await _push.NotificarUsuarioAsync(d.UsuarioId, envio.Criterio, envio.Payload, ct);
        var envioId = Guid.NewGuid();
        var gatilho = envio.Incluidas[0].Gatilho;

        try
        {
            // Grava mesmo com zero aparelhos alcançados (inscrições mortas): o evento foi
            // processado. Sem isso o motor reavaliaria o mesmo evento para sempre.
            await _livroCaixa.RegistrarAsync([.. envio.Incluidas.Select(p => new NotificacaoEnviada
            {
                UsuarioId = d.UsuarioId,
                SubprefeituraId = p.SubprefeituraId,
                Gatilho = p.Gatilho,
                Chave = p.Chave,
                EnvioId = envioId,
                EnviadoEm = agora,
            })]);
        }
        catch (Exception ex)
        {
            // O push JÁ saiu. O livro-caixa sustenta dedup e teto, os dois freios de volume,
            // então falha persistente aqui é o pior caso do motor: o mesmo push a cada ciclo.
            _logger.LogError(ex,
                "Push {Gatilho} SAIU para o usuário {UsuarioId} ({Total} aparelho(s)), mas a gravação " +
                "no livro-caixa falhou. Se o registro não existir, o mesmo push volta a cada ciclo.",
                gatilho, d.UsuarioId, enviados);
            return enviados;
        }

        _logger.LogInformation(
            "Push {Gatilho} para o usuário {UsuarioId}: {Subs} subprefeitura(s), {Total} aparelho(s).",
            gatilho, d.UsuarioId, envio.Incluidas.Count, enviados);
        return enviados;
    }
}
