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

    /// <summary>
    /// Lê o contexto da região e devolve o que este gatilho gostaria de notificar.
    /// </summary>
    /// <param name="ctx">Estado da região, montado pelo motor. Nunca nulo.</param>
    /// <param name="ct">Cancelamento do ciclo de coleta.</param>
    /// <returns>
    /// Lista vazia é o sinal de "não há nada a notificar", e é o caso comum: não é erro
    /// nem exceção. Pode devolver mais de uma pendência (o motor prioriza e desempata),
    /// mas duas com a mesma <c>Chave</c> não fazem sentido, porque a segunda seria
    /// descartada pelo dedup.
    /// </returns>
    /// <remarks>
    /// Não deve lançar: uma exceção aqui derruba a avaliação da região inteira e cala os
    /// outros gatilhos. Condição ausente ou dado faltando se resolve devolvendo lista vazia.
    /// </remarks>
    Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        ContextoGatilho ctx, CancellationToken ct = default);
}
