import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

const camadas: { id: string; beforeId?: string; filter?: unknown; paint: Record<string, unknown> }[] = [];
vi.mock('react-map-gl/maplibre', () => ({
  Source: ({ children }: { children: ReactNode }) => <>{children}</>,
  Layer: (p: (typeof camadas)[number]) => { camadas.push(p); return null; },
}));

import ManchaLayer from '../../../components/mapa/ManchaLayer';

const vazio = { type: 'FeatureCollection', features: [] } as const;
const ids = (camada: Parameters<typeof ManchaLayer>[0]['camada']) => {
  camadas.length = 0;
  render(<ManchaLayer camada={camada} pontos={{ ...vazio, features: [] }} idPrimeiroSimbolo="rotulo" />);
  return camadas.map((c) => c.id);
};

describe('ManchaLayer', () => {
  it('uma camada por banda em cada camada do mapa', () => {
    expect(ids('score')).toEqual(['pulsar-mancha-1', 'pulsar-mancha-2']);
    expect(ids('temperatura')).toEqual(['pulsar-mancha-0', 'pulsar-mancha-1', 'pulsar-mancha-2']);
    expect(ids('vento')).toHaveLength(4);
  });

  it('chuva usa uma camada só, pesada pelos mm, e tudo entra antes do primeiro símbolo', () => {
    expect(ids('chuva')).toEqual(['pulsar-mancha-chuva']);
    expect(camadas[0].paint['heatmap-weight']).toEqual(['interpolate', ['linear'], ['get', 'mm'], 0, 0, 25, 0.45]);
    expect(camadas.every((c) => c.beforeId === 'rotulo')).toBe(true);
  });
  it('no escuro, Atenção e Alerta na cor do semáforo a 62%, sem o esmaecer do zoom (4A)', () => {
    camadas.length = 0;
    render(<ManchaLayer camada="score" pontos={{ ...vazio, features: [] }} idPrimeiroSimbolo="rotulo" escuro />);
    const alerta = JSON.stringify(camadas[1].paint['heatmap-color']);
    expect(alerta).toContain('rgba(214, 44, 44, 0.62)'); // #D62C2C, o vermelho do semáforo
    expect(alerta).not.toContain('248, 113, 113'); // o tom claro que deixava rosado
    expect(camadas[1].paint['heatmap-opacity']).toBe(1);
    // No claro segue como antes: o esmaecer do zoom e a cor do semáforo com teto 0,44.
    ids('score');
    expect(JSON.stringify(camadas[1].paint['heatmap-color'])).toContain('rgba(214, 44, 44, 0.44)');
    expect(camadas[1].paint['heatmap-opacity']).not.toBe(1);
  });

  it('na Temperatura o verde espalha menos que o amarelo e o vermelho (6B)', () => {
    ids('temperatura');
    const raio = (i: number) => (camadas[i].paint['heatmap-radius'] as number[])[6]; // raio no zoom 9
    expect(raio(0)).toBeLessThan(raio(1));
    expect(raio(1)).toBe(raio(2));
  });
});
