import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TelaEscolher from '../../../features/ativacao/telas/TelaEscolher';

const subs = [
  { id: 's1', nome: 'Mooca', regiaoNome: 'Leste', faixaRisco: 'BAIXO' as const },
  { id: 's2', nome: 'Penha', regiaoNome: 'Leste', faixaRisco: 'MODERADO' as const },
  { id: 's3', nome: 'São Miguel', regiaoNome: 'Leste', faixaRisco: 'BAIXO' as const },
];

describe('TelaEscolher', () => {
  it('a localização marca a subprefeitura detectada', async () => {
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn().mockResolvedValue('s2')} onContinuar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Usar minha localização/ }));
    expect(await screen.findByText('Você está na Penha')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Penha' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Continuar · 1' })).toBeEnabled();
  });

  it('localização negada ou fora de SP: pede para escolher na lista', async () => {
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn().mockResolvedValue(null)} onContinuar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Usar minha localização/ }));
    expect(await screen.findByText('Escolha na lista abaixo')).toBeInTheDocument();
  });

  it('busca sem acento filtra a lista', () => {
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn()} onContinuar={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sao mig' } });
    expect(screen.getByRole('checkbox', { name: 'São Miguel' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Mooca' })).not.toBeInTheDocument();
  });

  it('salva só no Continuar e não avança se falhar', async () => {
    const onContinuar = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn()} onContinuar={onContinuar} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mooca' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Penha' }));
    expect(onContinuar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar · 2' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não conseguimos salvar. Tente de novo.');
    expect(onContinuar).toHaveBeenCalledWith(['s1', 's2']);

    fireEvent.click(screen.getByRole('button', { name: 'Continuar · 2' }));
    await waitFor(() => expect(onContinuar).toHaveBeenCalledTimes(2));
  });

  it('sem nada marcado o Continuar fica desabilitado', () => {
    render(<TelaEscolher subprefeituras={subs} localizar={vi.fn()} onContinuar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Continuar · 0' })).toBeDisabled();
  });
});
