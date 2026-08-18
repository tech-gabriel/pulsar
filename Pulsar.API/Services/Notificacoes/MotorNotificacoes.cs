using Microsoft.EntityFrameworkCore;
using Pulsar.API.Domain.Entities;
using Pulsar.API.Repositories.Data;
using Pulsar.API.Repositories.Interfaces;
using Pulsar.API.Services.Interfaces;

namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Onde a decisão de push acontece. Monta o contexto de cada região uma vez, roda todos os
/// gatilhos em cima dele, escolhe UMA pendência por ciclo, aplica os dois modos de dedup e o
/// teto diário, envia e registra no livro-caixa.
///
/// Toda a encanação vive aqui, e é isso que deixa os gatilhos sem banco, sem push e sem
/// preferência de usuário (ver <see cref="IGatilhoNotificacao"/>): acrescentar um alerta novo
/// é escrever mais uma implementação daquela interface e registrá-la no DI, sem tocar nesta
/// classe.
///
/// Resiliência é regra e não detalhe: cada região tem seu try/catch, que cobre a montagem do
/// contexto porque é lá que o fuso de texto livre é resolvido, e dentro dele cada gatilho tem
/// o seu. Uma região com fuso digitado errado ou um gatilho informativo quebrado não podem
/// calar o aviso de risco alto, nem da própria região nem das outras, que é o caminho de
/// segurança do produto.
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
        // verdade no dia em que o push fosse ligado. A retenção também não roda por este
        // caminho, e tudo bem: com push desligado não existe registro novo para expirar.
        if (!_push.Habilitado)
            return 0;

        // Um instante só para o ciclo inteiro. Reler o relógio por região faria duas regiões
        // avaliarem calendários diferentes na virada do dia local, e a chave do briefing é
        // justamente o dia local.
        var agora = DateTime.UtcNow;
        var regioes = await _db.Regioes.ToListAsync(ct);
        var enviadosTotal = 0;

        foreach (var regiao in regioes)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                enviadosTotal += await ProcessarRegiaoAsync(regiao, agora, ct);
            }
            catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                // Mensagem própria porque o desfecho é próprio: fuso é texto livre na Regiao,
                // e enquanto o valor não for corrigido esta região não notifica NUNCA, em
                // ciclo nenhum. Diluído no aviso genérico abaixo, isso vira um ruído de 15 em
                // 15 minutos que ninguém liga a uma região muda.
                _logger.LogError(ex,
                    "Fuso horário inválido na região {Nome}: {Fuso}. Enquanto o valor não for " +
                    "corrigido, esta região não recebe notificação nenhuma.",
                    regiao.Nome, regiao.FusoHorario);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao avaliar notificações da região {Nome}.", regiao.Nome);
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

    private async Task<int> ProcessarRegiaoAsync(Regiao regiao, DateTime agora, CancellationToken ct)
    {
        var ctx = await MontarContextoAsync(regiao, agora, ct);

        var pendencias = new List<NotificacaoPendente>();
        foreach (var gatilho in _gatilhos)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                pendencias.AddRange(await gatilho.AvaliarAsync(ctx, ct));
            }
            catch (Exception ex)
            {
                // try/catch POR GATILHO, e não um só em volta do loop: é o que o contrato de
                // IGatilhoNotificacao promete e o que deixa um gatilho falhar alto de propósito
                // (ver o TextoDaFaixa do briefing) sem levar junto o aviso de risco alto da
                // mesma região. Quem reestruturar este loop precisa preservá-lo.
                _logger.LogWarning(ex, "Gatilho {Gatilho} falhou na região {Nome}.", gatilho.Nome, regiao.Nome);
            }
        }

        var escolhida = await EscolherAsync(regiao.Id, pendencias, agora);
        if (escolhida is null) return 0;

        if (await EstourouTetoDiarioAsync(regiao, ctx.Fuso, agora))
        {
            _logger.LogInformation(
                "Teto diário de push atingido na região {Nome}. {Gatilho} suprimido.",
                regiao.Nome, escolhida.Gatilho);
            return 0;
        }

        var enviados = await _push.NotificarRegiaoAsync(
            regiao.Id, escolhida.Criterio, escolhida.Payload, ct);

        // Grava mesmo com zero destinatários: significa que o evento foi processado e ninguém
        // tinha opt-in. Sem isso o motor reavaliaria o mesmo evento para sempre.
        await _livroCaixa.RegistrarAsync(new NotificacaoEnviada
        {
            RegiaoId = regiao.Id,
            Gatilho = escolhida.Gatilho,
            Chave = escolhida.Chave,
            EnviadoEm = agora,
            Destinatarios = enviados,
        });

        _logger.LogInformation(
            "Push {Gatilho} da região {Nome}: {Total} destinatário(s).",
            escolhida.Gatilho, regiao.Nome, enviados);

        return enviados;
    }

    /// <summary>
    /// A pendência mais urgente que ainda NÃO foi coberta pelo livro-caixa, ou null se não
    /// sobrou nenhuma. Menor Prioridade = mais urgente; empate fica com a ordem de registro
    /// dos gatilhos no DI, porque o OrderBy do LINQ é estável.
    /// </summary>
    /// <remarks>
    /// Sai uma por ciclo: avisar que vai chover às 18h enquanto chove forte agora é ruído. As
    /// descartadas não gravam chave, então voltam a ser avaliadas no ciclo seguinte.
    ///
    /// O dedup entra ANTES da escolha e não depois, e a diferença é de comportamento. Uma
    /// pendência já coberta é uma notificação que a pessoa JÁ recebeu, então deixá-la ocupar a
    /// vaga do ciclo cala uma que ninguém recebeu. Numa manhã inteira de risco alto o gatilho
    /// de score emite pendência a cada ciclo e o cooldown cobre 45 dos 60 minutos: escolher
    /// primeiro e conferir depois faria o briefing diário, que só tem a janela da manhã, nunca
    /// sair justamente nos dias em que chove. Quem limita o volume é o teto diário, não isto.
    /// </remarks>
    private async Task<NotificacaoPendente?> EscolherAsync(
        Guid regiaoId, List<NotificacaoPendente> pendencias, DateTime agora)
    {
        foreach (var pendencia in pendencias.OrderBy(p => p.Prioridade))
        {
            if (!await JaCobertaAsync(regiaoId, pendencia, agora))
                return pendencia;
        }

        return null;
    }

    private async Task<ContextoGatilho> MontarContextoAsync(
        Regiao regiao, DateTime agora, CancellationToken ct)
    {
        var subs = await _db.Subprefeituras
            .Where(s => s.RegiaoId == regiao.Id && s.Ativa)
            .ToListAsync(ct);

        var estados = new List<EstadoSubprefeitura>(subs.Count);
        foreach (var sub in subs)
        {
            var score = await _db.ScoresPerigo
                .Where(s => s.SubprefeituraId == sub.Id)
                .OrderByDescending(s => s.Timestamp)
                .FirstOrDefaultAsync(ct);

            var leitura = await _db.LeiturasClimaticas
                .Where(l => l.SubprefeituraId == sub.Id)
                .OrderByDescending(l => l.Timestamp)
                .FirstOrDefaultAsync(ct);

            estados.Add(new EstadoSubprefeitura(sub, score, leitura));
        }

        return new ContextoGatilho
        {
            Regiao = regiao,
            // Texto livre vindo do banco: um typo lança aqui, e o catch por região existe
            // justamente para essa linha (ver AvaliarEDispararAsync).
            Fuso = TimeZoneInfo.FindSystemTimeZoneById(regiao.FusoHorario),
            Subprefeituras = estados,
            Previsao = await _previsaoService.ObterFaixasRegiaoAsync(
                regiao.Id, LimiaresNotificacao.MaxFaixasContexto, ct),
            AgoraUtc = agora,
        };
    }

    /// <summary>
    /// Os dois modos de dedup, e trocá-los muda o que o usuário recebe: sem Cooldown vale a
    /// CHAVE (exatamente um aviso por faixa de previsão, um briefing por dia local), com
    /// Cooldown vale a JANELA DESLIZANTE do gatilho na região, que ignora a chave (é o que
    /// impede o risco alto de virar um push a cada 15 min enquanto o risco durar).
    /// </summary>
    private async Task<bool> JaCobertaAsync(Guid regiaoId, NotificacaoPendente p, DateTime agora)
        => p.Cooldown is { } cooldown
            ? await _livroCaixa.ExisteDesdeAsync(regiaoId, p.Gatilho, agora - cooldown)
            : await _livroCaixa.ExisteChaveAsync(p.Chave);

    private async Task<bool> EstourouTetoDiarioAsync(Regiao regiao, TimeZoneInfo fuso, DateTime agora)
    {
        // Janela generosa em UTC e filtro convertendo cada instante para local. NÃO calcular
        // meia-noite local em UTC: em zona cuja virada do horário de verão cai à meia-noite ela
        // não existe naquele dia e a conversão lança. Ver o doc de FusoLocal.
        var recentes = await _livroCaixa.ObterRecentesPorRegiaoAsync(
            regiao.Id, LimiaresNotificacao.JanelaTetoDiarioHoras);

        var hojeLocal = FusoLocal.DiaLocal(agora, fuso);
        var hoje = recentes.Count(n => FusoLocal.DiaLocal(n.EnviadoEm, fuso) == hojeLocal);

        return hoje >= LimiaresNotificacao.MaxPushPorRegiaoPorDia;
    }
}
