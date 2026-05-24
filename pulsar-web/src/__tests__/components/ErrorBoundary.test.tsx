import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

function BomComponente() {
  return <p>Componente OK</p>;
}

function ComponenteQueLanca() {
  throw new Error('Erro de render');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza filhos quando não há erro', () => {
    render(
      <ErrorBoundary>
        <BomComponente />
      </ErrorBoundary>
    );
    expect(screen.getByText('Componente OK')).toBeInTheDocument();
  });

  it('exibe fallback padrão quando filho lança erro', () => {
    render(
      <ErrorBoundary>
        <ComponenteQueLanca />
      </ErrorBoundary>
    );
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Erro de render')).toBeInTheDocument();
  });

  it('exibe botão "Recarregar página" no fallback padrão', () => {
    render(
      <ErrorBoundary>
        <ComponenteQueLanca />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: 'Recarregar página' })).toBeInTheDocument();
  });

  it('usa fallback customizado quando fornecido', () => {
    render(
      <ErrorBoundary fallback={<p>Fallback externo</p>}>
        <ComponenteQueLanca />
      </ErrorBoundary>
    );
    expect(screen.getByText('Fallback externo')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
  });
});
