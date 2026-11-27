/** Toque do ponto crítico da Baixada (PontosCriticosLayer). */
export const ID_TOQUE_PONTOS_CRITICOS = 'pulsar-pontos-criticos-toque';

/**
 * Camadas com toque próprio desenhadas por cima das áreas e dos trechos: um toque nelas não pode
 * abrir também a área ou o trecho de baixo (nem mostrar o tooltip da área).
 */
export const CAMADAS_TOQUE_POR_CIMA = ['pulsar-ocorr-cluster-toque', 'pulsar-ocorr-cluster', 'pulsar-ocorr-ponto', ID_TOQUE_PONTOS_CRITICOS];
