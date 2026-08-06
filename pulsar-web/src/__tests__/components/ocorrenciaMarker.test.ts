import { describe, it, expect } from 'vitest';
import { iconeOcorrencia, formatarOcorrencia } from '../../components/mapa/ocorrenciaMarker';
import type { OcorrenciaAlagamentoDto } from '../../types';

const o: OcorrenciaAlagamentoDto = {
  id: '1', tipo: 'ALAGAMENTO', dataOcorrencia: '2026-04-01T00:00:00Z',
  latitude: -23.6, longitude: -46.5, nmSubprefeitura: 'VP - VILA PRUDENTE',
};

describe('ocorrenciaMarker', () => {
  it('formatarOcorrencia traz titulo, data pt-BR e subprefeitura', () => {
    const info = formatarOcorrencia(o);
    expect(info.titulo).toBe('Alagamento');
    // data-calendário formatada em UTC (não desloca o dia em fusos negativos)
    expect(info.data).toBe('01/04/2026');
    expect(info.subprefeitura).toBe('VP - VILA PRUDENTE');
  });

  it('formatarOcorrencia usa o rotulo legivel de INUNDACAO', () => {
    expect(formatarOcorrencia({ ...o, tipo: 'INUNDACAO' }).titulo).toBe('Inundação');
  });

  it('formatarOcorrencia lida com subprefeitura nula', () => {
    expect(formatarOcorrencia({ ...o, nmSubprefeitura: null }).subprefeitura).toBeNull();
  });

  it('iconeOcorrencia retorna um DivIcon com cor por tipo', () => {
    const alag = iconeOcorrencia('ALAGAMENTO');
    const inund = iconeOcorrencia('INUNDACAO');
    expect((alag.options.html as string)).toContain('svg');
    expect((inund.options.html as string)).toContain('svg');
    expect(alag.options.html).not.toBe(inund.options.html);
  });
});
