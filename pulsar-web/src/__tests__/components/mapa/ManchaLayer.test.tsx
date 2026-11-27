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
});
