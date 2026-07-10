import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LayerControl from '../../components/mapa/LayerControl';

describe('LayerControl (mobile)', () => {
  it('mostra um botão único com a camada ativa e abre o seletor', () => {
    const onChange = vi.fn();
    render(<LayerControl camadaAtiva="score" onChange={onChange} isMobile />);
    // botão-gatilho mostra a camada ativa
    const gatilho = screen.getByRole('button', { name: /camadas/i });
    expect(gatilho).toHaveTextContent(/score/i);
    // seletor fechado: "Chuva" não visível ainda
    expect(screen.queryByRole('radio', { name: 'Chuva' })).toBeNull();
    fireEvent.click(gatilho);
    // abre e escolhe "Chuva"
    fireEvent.click(screen.getByRole('radio', { name: 'Chuva' }));
    expect(onChange).toHaveBeenCalledWith('chuva');
  });
});
