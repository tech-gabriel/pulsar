import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MapaCena from '../../components/landing/MapaCena';
import { SUBPREFEITURAS } from '../../components/landing/mapaPaths';

describe('MapaCena', () => {
  it('desenha as 32 subprefeituras em qualquer cena', () => {
    const { container } = render(<MapaCena cena="acender" />);
    expect(container.querySelectorAll('path[data-subprefeitura]')).toHaveLength(
      SUBPREFEITURAS.length,
    );
  });

  it('na cena "acender" o mapa está apagado (sem cor de risco)', () => {
    const { container } = render(<MapaCena cena="acender" />);
    const coloridos = container.querySelectorAll('path[data-risco]');
    expect(coloridos).toHaveLength(0);
  });

  it('na cena "risco" cada subprefeitura ganha uma faixa de risco', () => {
    const { container } = render(<MapaCena cena="risco" />);
    expect(container.querySelectorAll('path[data-risco]')).toHaveLength(
      SUBPREFEITURAS.length,
    );
  });

  it('na cena "score" destaca uma subprefeitura e mostra o número', () => {
    const { container } = render(<MapaCena cena="score" />);
    expect(container.querySelectorAll('path[data-foco="true"]')).toHaveLength(1);
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it('na cena "alagamento" mostra os pontos de ocorrência', () => {
    const { container } = render(<MapaCena cena="alagamento" />);
    expect(container.querySelectorAll('circle[data-alagamento]').length).toBeGreaterThan(0);
  });

  it('na cena "alerta" anuncia o alerta em texto acessível', () => {
    render(<MapaCena cena="alerta" />);
    expect(screen.getByRole('status')).toHaveTextContent(/risco alto/i);
  });

  it('o SVG é decorativo para leitores de tela', () => {
    const { container } = render(<MapaCena cena="risco" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('por padrão usa o viewBox cheio (comportamento da narrativa preservado)', () => {
    const { container } = render(<MapaCena cena="risco" />);
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 1000 1542.3');
  });

  it('com "compacta" recorta a cauda sul sem remover subprefeituras do SVG', () => {
    const { container } = render(<MapaCena cena="risco" compacta />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 1000 920');
    expect(container.querySelectorAll('path[data-subprefeitura]')).toHaveLength(
      SUBPREFEITURAS.length,
    );
  });
});
