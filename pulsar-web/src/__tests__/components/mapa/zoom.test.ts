import { describe, it, expect } from 'vitest';
import { ZOOM, desvioDaBola, diametroDaBola, tamanhoParaZoom } from '../../../components/mapa/zoom';

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

describe('diametroDaBola', () => {
  const base = { zoom: 9, camadaAtiva: 'score' as const };

  it('sem bola quando os números somem (alagamentos, rota, de perto com trechos)', () => {
    expect(diametroDaBola({ ...base, atenuado: true })).toBeNull();
    expect(diametroDaBola({ ...base, oculta: true })).toBeNull();
    expect(diametroDaBola({ ...base, zoom: 11, comTrechos: true })).toBeNull();
    expect(diametroDaBola({ ...base, zoom: 8 })).toBeNull();
  });

  it('risco e temperatura têm a bola do mesmo tamanho (26 px na vista da cidade)', () => {
    expect(diametroDaBola(base)).toBe(26);
    expect(diametroDaBola({ ...base, camadaAtiva: 'temperatura' })).toBe(26);
    expect(diametroDaBola({ ...base, zoom: 11, comTrechos: true, camadaAtiva: 'chuva' })).not.toBeNull();
  });
});

describe('desvioDaBola', () => {
  const bola = { x: 100, y: 100, r: 11 };

  it('longe dos pontos, a bola não se mexe', () => {
    expect(desvioDaBola(bola, [{ x: 200, y: 200 }], [])).toEqual({ x: 0, y: 0 });
  });

  it('embaixo do ponto, sai para o lado oposto e para de encostar nele', () => {
    const ponto = { x: 105, y: 100 };
    const d = desvioDaBola(bola, [ponto], []);
    expect(d.x).toBeLessThan(0);
    expect(Math.hypot(bola.x + d.x - ponto.x, bola.y + d.y - ponto.y)).toBeGreaterThanOrEqual(bola.r + 16);
  });

  it('não vai parar em cima de outra bola', () => {
    const ponto = { x: 105, y: 100 };
    const vizinha = { x: 78, y: 100, r: 11 }; // bem no caminho para a esquerda
    const d = desvioDaBola(bola, [ponto], [vizinha]);
    expect(Math.hypot(bola.x + d.x - vizinha.x, bola.y + d.y - vizinha.y)).toBeGreaterThanOrEqual(bola.r + vizinha.r + 2);
    expect(Math.hypot(bola.x + d.x - ponto.x, bola.y + d.y - ponto.y)).toBeGreaterThanOrEqual(bola.r + 16);
  });
});
