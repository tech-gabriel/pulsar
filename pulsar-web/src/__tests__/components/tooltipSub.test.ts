import { describe, it, expect } from 'vitest';
import { tooltipSubprefeituraHtml } from '../../components/mapa/tooltipSub';
import type { SubprefeituraMapaDto } from '../../types';

const sub = (faixaRisco: SubprefeituraMapaDto['faixaRisco']) => ({
  id: 's1', nome: 'Mooca', zona: 'Leste', latitude: 0, longitude: 0, faixaRisco,
  scoreAtual: { valor: 45, faixa: faixaRisco, timestamp: '' }, ultimaLeitura: null,
}) as unknown as SubprefeituraMapaDto;

describe('tooltip da subprefeitura no mapa', () => {
  it.each([['BAIXO', 'Tranquilo'], ['MODERADO', 'Atenção'], ['ALTO', 'Alerta']] as const)(
    'faixa %s aparece como %s, sem o vocabulário antigo', (faixa, rotulo) => {
      const html = tooltipSubprefeituraHtml(sub(faixa), 'Mooca');
      expect(html).toContain(`>${rotulo}</span>`);
      expect(html).not.toMatch(/Risco (baixo|moderado|alto)/);
    });
});
