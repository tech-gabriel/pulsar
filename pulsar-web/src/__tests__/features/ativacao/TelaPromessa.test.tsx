import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TelaPromessa from '../../../features/ativacao/telas/TelaPromessa';

describe('TelaPromessa', () => {
  it('promete, mostra os 3 fatos (sem "grátis") e começa', () => {
    const onComecar = vi.fn();
    const { container } = render(<TelaPromessa onComecar={onComecar} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Saiba antes de a água chegar.');
    expect(container.textContent).toMatch(/32\s*subprefeituras/);
    expect(container.textContent).toMatch(/15 min\s*atualização/);
    expect(container.textContent).toMatch(/3\s*perigos/);
    expect(container.textContent).not.toMatch(/grátis/i);
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onComecar).toHaveBeenCalled();
  });
});
