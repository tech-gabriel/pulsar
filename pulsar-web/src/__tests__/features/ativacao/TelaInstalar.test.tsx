import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TelaInstalar from '../../../features/ativacao/telas/TelaInstalar';

describe('TelaInstalar', () => {
  it('iPhone: passo a passo e saída sem alertas', () => {
    const onSemAlertas = vi.fn();
    render(<TelaInstalar variante="ios" onInstalar={vi.fn()} onInstalado={vi.fn()} onSemAlertas={onSemAlertas} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Coloque o Pulsar na sua tela de início');
    expect(screen.getByText('Compartilhar')).toBeInTheDocument();
    expect(screen.getByText('Adicionar à Tela de Início')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sem alertas' }));
    expect(onSemAlertas).toHaveBeenCalled();
  });

  it('Android/computador: instala e avança depois de 600 ms', async () => {
    vi.useFakeTimers();
    const onInstalado = vi.fn();
    render(<TelaInstalar variante="prompt" onInstalar={vi.fn().mockResolvedValue(true)} onInstalado={onInstalado} onSemAlertas={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Instalar o Pulsar' })); });
    expect(screen.getByRole('button', { name: 'Instalado' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(600); });
    expect(onInstalado).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('instalação recusada: continua na tela', async () => {
    const onInstalado = vi.fn();
    render(<TelaInstalar variante="prompt" onInstalar={vi.fn().mockResolvedValue(false)} onInstalado={onInstalado} onSemAlertas={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Instalar o Pulsar' })); });
    expect(screen.getByRole('button', { name: 'Instalar o Pulsar' })).toBeInTheDocument();
    expect(onInstalado).not.toHaveBeenCalled();
  });
});
