namespace Pulsar.API.Services.Interfaces;

/// <summary>
/// Ponto único de decisão de push do ciclo de coleta. Quem chama não precisa saber quais
/// gatilhos existem nem como o dedup funciona: chama uma vez por ciclo e segue a vida.
/// </summary>
public interface IMotorNotificacoes
{
    /// <summary>
    /// Avalia os gatilhos de todas as regiões e dispara o que passar.
    /// </summary>
    /// <returns>
    /// Quantos push saíram no ciclo, somando as regiões. Zero é desfecho normal e comum
    /// (nenhum gatilho tinha o que dizer, ou o que tinham já havia saído), não é erro.
    /// <para>
    /// Pode SUBESTIMAR: uma exceção que estoure depois de o push sair (a limpeza de
    /// inscrições mortas, por exemplo) leva junto a soma daquela região. Serve para
    /// acompanhar volume, não para auditar entrega.
    /// </para>
    /// </returns>
    /// <remarks>
    /// Não lança em operação normal: falha de uma região é contida e registrada, para que
    /// as outras sigam sendo avaliadas. Ver <c>MotorNotificacoes</c>.
    /// </remarks>
    Task<int> AvaliarEDispararAsync(CancellationToken ct = default);
}
