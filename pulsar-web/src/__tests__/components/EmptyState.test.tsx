import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

describe('EmptyState', () => {
  it('mostra a mensagem', () => {
    render(<EmptyState Icon={Inbox} mensagem="Nada por aqui." />);
    expect(screen.getByText('Nada por aqui.')).toBeInTheDocument();
  });

  it('mostra o título quando fornecido', () => {
    render(<EmptyState Icon={Inbox} titulo="Vazio" mensagem="Sem itens." />);
    expect(screen.getByText('Vazio')).toBeInTheDocument();
    expect(screen.getByText('Sem itens.')).toBeInTheDocument();
  });

  it('renderiza a ação opcional', () => {
    render(
      <EmptyState Icon={Inbox} mensagem="Sem itens." acao={<button>Atualizar</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument();
  });

  it('com card={false} não envolve em glass-card', () => {
    const { container } = render(<EmptyState Icon={Inbox} mensagem="Sem itens." card={false} />);
    expect(container.querySelector('.glass-card')).toBeNull();
  });

  it('por padrão envolve em glass-card', () => {
    const { container } = render(<EmptyState Icon={Inbox} mensagem="Sem itens." />);
    expect(container.querySelector('.glass-card')).not.toBeNull();
  });
});
