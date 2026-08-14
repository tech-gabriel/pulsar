import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LayerControl from '../../components/mapa/LayerControl';

describe('LayerControl (mobile)', () => {
  // WCAG 2.5.3 (Label in Name): o nome acessível precisa conter o texto visível,
  // senão o controle por voz não ativa o botão. Aqui o texto visível é o nome da
  // camada ativa, que muda; o nome acessível tem que acompanhar.
  it('começa o nome acessível do gatilho pela camada visível', () => {
    render(<LayerControl camadaAtiva="chuva" onChange={vi.fn()} isMobile />);
    const gatilho = screen.getByRole('button', { name: /^chuva/i });
    expect(gatilho).toHaveTextContent(/chuva/i);
  });

  it('mostra um botão único com a camada ativa e abre o seletor', () => {
    const onChange = vi.fn();
    render(<LayerControl camadaAtiva="score" onChange={onChange} isMobile />);
    // botão-gatilho mostra a camada ativa
    const gatilho = screen.getByRole('button', { name: /escolher camada/i });
    expect(gatilho).toHaveTextContent(/score/i);
    // seletor fechado: "Chuva" não visível ainda
    expect(screen.queryByRole('radio', { name: 'Chuva' })).toBeNull();
    fireEvent.click(gatilho);
    // abre e escolhe "Chuva"
    fireEvent.click(screen.getByRole('radio', { name: 'Chuva' }));
    expect(onChange).toHaveBeenCalledWith('chuva');
  });

  it('fecha o seletor ao pressionar Escape', () => {
    render(<LayerControl camadaAtiva="score" onChange={vi.fn()} isMobile />);
    fireEvent.click(screen.getByRole('button', { name: /escolher camada/i }));
    expect(screen.getByRole('radio', { name: 'Chuva' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('radio', { name: 'Chuva' })).toBeNull();
  });

  it('fecha o seletor ao tocar fora', () => {
    render(<LayerControl camadaAtiva="score" onChange={vi.fn()} isMobile />);
    fireEvent.click(screen.getByRole('button', { name: /escolher camada/i }));
    expect(screen.getByRole('radio', { name: 'Chuva' })).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('radio', { name: 'Chuva' })).toBeNull();
  });
});
