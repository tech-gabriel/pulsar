import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReleaseEntry from '../../components/novidades/ReleaseEntry';
import type { Release } from '../../data/changelog';

const release: Release = {
  versao: '1.1.0',
  data: '2026-06-30',
  resumo: 'Resumo de teste',
  itens: [{ tipo: 'novo', titulo: 'Notificações push', descricao: 'Descrição do item.' }],
};

describe('ReleaseEntry', () => {
  it('mostra versão, data pt-BR, resumo e itens', () => {
    render(<ReleaseEntry release={release} />);
    expect(screen.getByText('v1.1.0')).toBeInTheDocument();
    expect(screen.getByText('30 jun 2026')).toBeInTheDocument();
    expect(screen.getByText('Resumo de teste')).toBeInTheDocument();
    expect(screen.getByText('Notificações push')).toBeInTheDocument();
    expect(screen.getByText('NOVO')).toBeInTheDocument();
  });
});
