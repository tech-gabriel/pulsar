import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MapaBaixada, { LegendaMapaBaixada } from '../../../components/landing/MapaBaixada';

describe('MapaBaixada', () => {
  it('desenha os 9 municípios', () => {
    const { container } = render(<MapaBaixada />);
    expect(container.querySelectorAll('path[data-id]')).toHaveLength(9);
  });

  it('descreve cada município com os números dos dados', () => {
    const { container } = render(<MapaBaixada />);
    expect(container.querySelector('path[data-id="santos"] title')?.textContent).toBe('Santos: 129 de 397 trechos costumam alagar');
  });

  it('marca o selecionado e responde ao clique', () => {
    const onSelecionar = vi.fn();
    const { container } = render(<MapaBaixada selecionado="santos" onSelecionar={onSelecionar} />);
    expect(container.querySelector('path[data-id="santos"]')).toHaveAttribute('stroke', 'var(--color-pulsar-600)');
    fireEvent.click(container.querySelector('path[data-id="sao-vicente"]')!);
    expect(onSelecionar).toHaveBeenCalledWith('sao-vicente');
  });

  it('a legenda fala de trechos', () => {
    render(<LegendaMapaBaixada />);
    expect(screen.getByText('mais trechos que costumam alagar')).toBeInTheDocument();
  });
});
