import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../../contexts/ToastContext';
import ToastContainer from '../../components/ui/ToastContainer';

function BotoesToast() {
  const { showToast } = useToast();
  return (
    <>
      <button onClick={() => showToast('Operação concluída', 'success')}>Sucesso</button>
      <button onClick={() => showToast('Ocorreu um erro', 'error')}>Erro</button>
      <button onClick={() => showToast('Informação', 'info')}>Info</button>
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <BotoesToast />
      <ToastContainer />
    </ToastProvider>
  );
}

describe('ToastContext', () => {
  it('exibe toast de sucesso', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Sucesso'));
    expect(screen.getByText('Operação concluída')).toBeInTheDocument();
  });

  it('exibe toast de erro', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Erro'));
    expect(screen.getByText('Ocorreu um erro')).toBeInTheDocument();
  });

  it('exibe toast de info', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Info'));
    expect(screen.getByText('Informação')).toBeInTheDocument();
  });

  it('remove toast ao clicar em fechar', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Sucesso'));
    expect(screen.getByText('Operação concluída')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByText('Operação concluída')).not.toBeInTheDocument();
  });

  it('remove toast automaticamente após 3s', async () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByText('Info'));
    expect(screen.getByText('Informação')).toBeInTheDocument();

    await act(() => { vi.advanceTimersByTime(3100); });
    expect(screen.queryByText('Informação')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('lança erro se useToast for usado fora do provider', () => {
    function SemProvider() {
      useToast();
      return null;
    }
    expect(() => render(<SemProvider />)).toThrow('useToast must be used inside ToastProvider');
  });
});
