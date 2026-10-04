import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LinhaArea from '../../../features/cidade/LinhaArea';
import type { Area } from '../../../features/cidade/areas';

const area = { id: 's1', nome: 'Itaquera', zona: 'Leste', faixaRisco: 'ALTO', scoreAtual: { valor: 78, faixa: 'ALTO', timestamp: '', perigoPrincipal: 'ALAGAMENTO' } } as Area;

describe('LinhaArea', () => {
  it('nome, zona como legenda com o perigo, e toque', () => {
    const onClick = vi.fn();
    render(<LinhaArea area={area} onClick={onClick} />);
    const botao = screen.getByRole('button', { name: /Itaquera/ });
    expect(botao).toHaveTextContent('Leste · alagamento');
    fireEvent.click(botao);
    expect(onClick).toHaveBeenCalled();
  });
  it('em risco baixo a legenda é só a zona', () => {
    render(<LinhaArea area={{ ...area, faixaRisco: 'BAIXO' }} onClick={vi.fn()} />);
    expect(screen.getByRole('button')).not.toHaveTextContent('alagamento');
  });
});
