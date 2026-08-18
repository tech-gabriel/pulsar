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
    /// Não deve lançar em operação normal: condição ausente ou dado faltando se resolve
    /// devolvendo lista vazia, que é o sinal previsto para isso.
    ///
    /// Se lançar mesmo assim, o alcance é MENOR do que este doc afirmava antes. O motor é
    /// obrigado a envolver CADA gatilho no seu próprio try/catch, então a exceção é
    /// registrada com o nome do gatilho e o da região e o loop continua: os outros gatilhos
    /// daquela região seguem rodando e disparando. O custo é a notificação DAQUELE gatilho,
    /// DAQUELA região, NAQUELE ciclo. Em particular, o aviso de risco alto, que é o caminho
    /// de segurança, não é calado por um gatilho informativo quebrado.
    ///
    /// Esse try/catch por gatilho é parte do contrato, e não detalhe interno do motor: quem
    /// reestruturar o loop precisa preservá-lo, porque é ele que sustenta o isolamento
    /// descrito aqui. É também o que deixa um gatilho lançar DE PROPÓSITO diante de erro de
    /// programação sem arriscar o resto: ver o switch de TextoDaFaixa em
    /// GatilhoBriefingDiario, que prefere explodir a chamar de "baixo" uma faixa que não
    /// sabe traduzir.
    /// </remarks>
    Task<IReadOnlyList<NotificacaoPendente>> AvaliarAsync(
        ContextoGatilho ctx, CancellationToken ct = default);
}
