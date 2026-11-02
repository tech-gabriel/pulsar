import { describe, it, expect } from 'vitest';
import {
  DISCO,
  GLIFO,
  TRANSFORM_GLIFO,
  corOcorrencia,
  svgOcorrencia,
  ocorrenciasGeojson,
  formatarOcorrencia,
} from '../../components/mapa/ocorrenciaMarker';
import { PALETA } from '../../utils/paleta';
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

  it('svgOcorrencia devolve SVG distinto por tipo', () => {
    const a = svgOcorrencia('ALAGAMENTO');
    const i = svgOcorrencia('INUNDACAO');
    expect(a.startsWith('<svg')).toBe(true);
    expect(a).toContain(PALETA.azul);
    expect(i).toContain(PALETA.azulProfundo);
    expect(a).not.toBe(i);
  });

  it('ocorrenciasGeojson monta pontos lon/lat e lida com lista vazia', () => {
    expect(ocorrenciasGeojson([]).features).toEqual([]);
    const f = ocorrenciasGeojson([o]).features[0];
    expect(f.geometry.coordinates).toEqual([-46.5, -23.6]);
    expect(f.properties).toEqual({ id: '1', tipo: 'ALAGAMENTO' });
  });

  // Os glifos já saíram tortos uma vez (ondas 2,1px à esquerda, gota 1,25px
  // acima). O centro da grade 24x24 do lucide tem que cair exatamente no centro
  // do disco depois do transform, senão o pictograma volta a ficar deslocado.
  it('o transform centraliza a grade do lucide no centro do disco', () => {
    const m = /^translate\((-?[\d.]+) (-?[\d.]+)\) scale\(([\d.]+)\)$/.exec(TRANSFORM_GLIFO);
    expect(m).not.toBeNull();
    const [dx, dy, escala] = m!.slice(1).map(Number);
    const CENTRO_GRADE = 12; // metade da grade 24x24 do lucide
    expect(dx + CENTRO_GRADE * escala).toBeCloseTo(DISCO.cx, 5);
    expect(dy + CENTRO_GRADE * escala).toBeCloseTo(DISCO.cy, 5);
  });

  it('as cores dos marcadores saem da paleta das leituras do mapa', () => {
    expect(corOcorrencia('ALAGAMENTO')).toBe(PALETA.azul);
    expect(corOcorrencia('INUNDACAO')).toBe(PALETA.azulProfundo);
  });

  it('cada tipo tem os caminhos do glifo correspondente', () => {
    expect(GLIFO.ALAGAMENTO).toHaveLength(1); // droplet
    expect(GLIFO.INUNDACAO).toHaveLength(3); // waves-horizontal
  });
});
