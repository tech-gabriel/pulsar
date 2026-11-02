import { describe, it, expect } from 'vitest';
import { ZOOM, tamanhoParaZoom } from '../../../components/mapa/zoom';

describe('zoom do mapa (escala MapLibre)', () => {
  it('converte a escala do Leaflet (-1)', () => {
    expect(tamanhoParaZoom(8)).toBeNull();
    expect(tamanhoParaZoom(9)).toEqual({ diametro: 32, fonte: 11, nomeFonte: 0 });
    expect(tamanhoParaZoom(10)).toEqual({ diametro: 32, fonte: 11, nomeFonte: 9 });
    expect(tamanhoParaZoom(11)).toEqual({ diametro: 35, fonte: 12, nomeFonte: 10 });
    expect(tamanhoParaZoom(12)).toEqual({ diametro: 38, fonte: 13, nomeFonte: 11 });
    expect(tamanhoParaZoom(16)).toEqual({ diametro: 38, fonte: 13, nomeFonte: 11 });
  });

  it('zoom fracionário arredonda', () => {
    expect(tamanhoParaZoom(10.49)).toEqual(tamanhoParaZoom(10));
    expect(tamanhoParaZoom(10.5)).toEqual(tamanhoParaZoom(11));
    expect(tamanhoParaZoom(8.49)).toBeNull();
  });

  it('enquadramentos', () => {
    expect(ZOOM).toEqual({ sp: 9, regiao: 10, sub: 12, busca: 15 });
  });
});
