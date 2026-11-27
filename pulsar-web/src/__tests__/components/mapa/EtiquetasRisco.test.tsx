import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Etiqueta } from '../../../features/mapa/etiquetas';

// Mapa falso: tela de 400 x 800, cada lon vira um x fixo (lon * 1000 + 46900), lat fica no meio.
const container = vi.hoisted(() => {
  const div = document.createElement('div');
  Object.defineProperty(div, 'clientWidth', { value: 400 });
  Object.defineProperty(div, 'clientHeight', { value: 800 });
  document.body.appendChild(div); // o portal entra aqui; fora da página o screen não acha
  return div;
});
vi.mock('react-map-gl/maplibre', () => ({
  useMap: () => ({
    current: {
      getMap: () => ({
        getCanvasContainer: () => container,
        getZoom: () => 12,
        project: ([lon]: [number, number]) => ({ x: lon * 1000 + 46900, y: 400 }),
        on: vi.fn(),
        off: vi.fn(),
      }),
    },
  }),
}));

import EtiquetasRisco from '../../../components/mapa/EtiquetasRisco';

const etq = (areaId: string, nome: string, nivel: Etiqueta['nivel'], lon: number): Etiqueta => ({
  areaId, nome, nivel, perigo: 'chuva', valor: '78', motivo: 'Chuva de 32 mm em 3 h', lon, lat: -23.5,
});

// Sé e Lapa longe uma da outra (x 300 e 100); Mooca no mesmo ponto da Sé, em Atenção.
const se = etq('se', 'Sé', 'alerta', -46.6);
const lapa = etq('lapa', 'Lapa', 'atencao', -46.8);
const mooca = etq('mooca', 'Mooca', 'atencao', -46.6);

const montar = async (onAbrir = vi.fn(), onOcultas = vi.fn()) => {
  render(<EtiquetasRisco etiquetas={[se, lapa, mooca]} bloqueios={() => []} onAbrir={onAbrir} onOcultas={onOcultas} />);
  // A colisão roda um quadro depois do render.
  await waitFor(() => expect(onOcultas).toHaveBeenLastCalledWith(new Set(['mooca'])));
  return { onAbrir, onOcultas };
};

describe('EtiquetasRisco', () => {
  it('um botao por etiqueta mostrada, com o nome do risco completo; clicar abre a area', async () => {
    const { onAbrir } = await montar();
    const mapa = screen.getByTestId('etiquetas-no-mapa');
    const botoes = within(mapa).getAllByRole('button');
    expect(botoes.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Sé: Alerta de alagamento. Chuva de 32 mm em 3 h',
      'Lapa: Atenção de alagamento. Chuva de 32 mm em 3 h',
    ]);
    fireEvent.click(botoes[1]);
    expect(onAbrir).toHaveBeenCalledWith('lapa');
  });

  it('Alerta tem disco em losango, Atencao em circulo', async () => {
    await montar();
    const mapa = screen.getByTestId('etiquetas-no-mapa');
    const [alerta, atencao] = within(mapa).getAllByRole('button');
    expect(alerta.querySelector('.etiqueta-disco')).toHaveClass('losango');
    expect(atencao.querySelector('.etiqueta-disco')).not.toHaveClass('losango');
  });

  it('a lista "Areas em risco agora" tem todas, inclusive a que nao coube', async () => {
    const { onAbrir } = await montar();
    const lista = screen.getByRole('list', { name: 'Áreas em risco agora' });
    const botoes = within(lista).getAllByRole('button');
    expect(botoes).toHaveLength(3);
    fireEvent.click(within(lista).getByRole('button', { name: /^Mooca/ }));
    expect(onAbrir).toHaveBeenCalledWith('mooca');
  });

  it('avisa quais nao couberam', async () => {
    const { onOcultas } = await montar();
    expect(onOcultas).toHaveBeenLastCalledWith(new Set(['mooca']));
  });
});
