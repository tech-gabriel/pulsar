import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { SubprefeituraMapaDto } from '../../../types';

const mapa = vi.hoisted(() => ({ zoom: 11 }));
vi.mock('react-map-gl/maplibre', () => ({
  useMap: () => ({ current: { getZoom: () => mapa.zoom, getMap: () => ({ on: vi.fn(), off: vi.fn() }) } }),
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import ScoreLabel from '../../../components/mapa/ScoreLabel';

const sub = {
  id: 's1', nome: 'Vila Prudente', zona: 'Leste', latitude: -23.58, longitude: -46.57, faixaRisco: 'BAIXO',
  scoreAtual: { valor: 17, faixa: 'BAIXO' },
} as unknown as SubprefeituraMapaDto;

const bolas = (o: { comTrechos: boolean; zoom: number; camada?: 'score' | 'chuva' }) => {
  mapa.zoom = o.zoom;
  const { container, unmount } = render(
    <ScoreLabel subprefeituras={[sub]} subSelecionada={null} camadaAtiva={o.camada ?? 'score'} zonaEmFoco={null} comTrechos={o.comTrechos} />,
  );
  const n = container.querySelectorAll('.pulsar-score-circle').length;
  unmount();
  return n;
};

// Escolha A de 16/11/2026: de perto quem fala é o trecho; a bola da área por cima dos hexágonos confundia.
describe('ScoreLabel com trechos', () => {
  it('de perto, com trechos, fica só o nome da área', () => {
    expect(bolas({ comTrechos: true, zoom: 11 })).toBe(0);
  });
  it('de longe, ou sem trechos, ou em outra camada, a bola continua', () => {
    expect(bolas({ comTrechos: true, zoom: 10 })).toBe(1);
    expect(bolas({ comTrechos: false, zoom: 11 })).toBe(1);
    expect(bolas({ comTrechos: true, zoom: 11, camada: 'chuva' })).toBe(1);
  });
});
