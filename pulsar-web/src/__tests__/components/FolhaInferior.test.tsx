import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
vi.mock('../../hooks/useIsMobile', () => ({ useIsMobile: () => true }));

import FolhaInferior from '../../components/ui/FolhaInferior';

function Demo({ onFechar = vi.fn() }: { onFechar?: () => void }) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button onClick={() => setAberta(true)}>Abrir</button>
      <FolhaInferior aberta={aberta} onFechar={() => { onFechar(); setAberta(false); }} tituloId="t">
        <h2 id="t">Título</h2>
        <button>Primeiro</button>
        <button data-foco-inicial>Seguro</button>
      </FolhaInferior>
    </>
  );
}

describe('FolhaInferior', () => {
  it('abre como diálogo modal rotulado e foca a ação segura', () => {
    render(<Demo />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialogo = screen.getByRole('dialog', { name: 'Título' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Seguro' })).toHaveFocus();
  });

  it('Esc fecha e devolve o foco a quem abriu', async () => {
    const onFechar = vi.fn();
    render(<Demo onFechar={onFechar} />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    abrir.focus();
    fireEvent.click(abrir);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onFechar).toHaveBeenCalled();
    await vi.waitFor(() => expect(abrir).toHaveFocus());
  });

  it('toque no fundo fecha', () => {
    const onFechar = vi.fn();
    render(<Demo onFechar={onFechar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    fireEvent.click(screen.getByTestId('folha-fundo'));
    expect(onFechar).toHaveBeenCalled();
  });

  it('Tab não sai da folha', () => {
    render(<Demo />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    screen.getByRole('button', { name: 'Seguro' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
  });
});
