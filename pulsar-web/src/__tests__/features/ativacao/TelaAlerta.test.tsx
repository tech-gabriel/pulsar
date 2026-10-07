import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TelaAlerta from '../../../features/ativacao/telas/TelaAlerta';

describe('TelaAlerta', () => {
  it('mostra o aviso real, as garantias com os lugares e ativa', () => {
    const onAtivar = vi.fn();
    render(<TelaAlerta nomes={['Mooca', 'Penha']} ocupado={false} onAtivar={onAtivar} />);
    expect(screen.getByText('Alerta de alagamento na Mooca')).toBeInTheDocument();
    expect(screen.getByText(/Só sobre Mooca e Penha/)).toBeInTheDocument();
    expect(screen.getByText(/No máximo 3 avisos por dia/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ativar alertas' }));
    expect(onAtivar).toHaveBeenCalled();
  });

  it('retomada no app instalado: faixa e título próprios', () => {
    render(<TelaAlerta nomes={['Mooca']} ocupado={false} onAtivar={vi.fn()} retomada />);
    expect(screen.getByRole('status')).toHaveTextContent('App instalado. Falta só um passo.');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Agora sim: ative os alertas');
  });

  it('ocupado desabilita o botão (pedido do navegador aberto)', () => {
    render(<TelaAlerta nomes={['Mooca']} ocupado onAtivar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Ativando…' })).toBeDisabled();
  });
});
