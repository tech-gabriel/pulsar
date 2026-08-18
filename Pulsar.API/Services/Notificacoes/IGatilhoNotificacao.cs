namespace Pulsar.API.Services.Notificacoes;

/// <summary>
/// Uma regra que decide se vale notificar. Não sabe nada de push, de banco nem de
/// preferência de usuário. Adicionar um alerta por condição (frente N1) é escrever
/// mais uma implementação disto, sem tocar em encanação.
/// </summary>
public interface IGatilhoNotificacao
{
    /// <summary>Identificador estável, gravado no livro-caixa. Kebab-case.</summary>
    string Nome { get; }

    Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        ContextoGatilho ctx, CancellationToken ct = default);
}
