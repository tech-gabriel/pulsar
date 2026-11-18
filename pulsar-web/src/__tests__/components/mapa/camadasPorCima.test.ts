import { describe, it, expect } from 'vitest';
import { CAMADAS_TOQUE_POR_CIMA } from '../../../components/mapa/camadasPorCima';
import { ID_TOQUE_PONTOS_CRITICOS } from '../../../components/mapa/camadasPorCima';

// O toque num ponto crítico não pode abrir a área e o trecho que estão por baixo dele.
describe('camadas que tomam o toque das áreas e dos trechos', () => {
  it('inclui o toque dos pontos críticos e o das ocorrências', () => {
    expect(CAMADAS_TOQUE_POR_CIMA).toContain(ID_TOQUE_PONTOS_CRITICOS);
    expect(CAMADAS_TOQUE_POR_CIMA).toContain('pulsar-ocorr-ponto');
  });
});
