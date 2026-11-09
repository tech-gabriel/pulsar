import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ excluir: vi.fn(), toast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ excluirConta: h.excluir }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: h.toast }) }));
vi.mock('../../components/ui/Header', () => ({ default: () => null }));

import ExcluirContaPage from '../../pages/ExcluirContaPage';

const botao = () => screen.getByRole('button', { name: /Excluir minha conta|Excluindo/ });
const campo = () => screen.getByLabelText(/Para confirmar, digite/);
const digitar = (v: string) => fireEvent.change(campo(), { target: { value: v } });

describe('ExcluirContaPage (C1)', () => {
  beforeEach(() => {
    h.excluir.mockReset();
    h.toast.mockReset();
    render(<MemoryRouter><ExcluirContaPage /></MemoryRouter>);
  });

  it('lista o que é apagado', () => {
    for (const t of ['Casa e trabalho', 'Subprefeituras que você acompanha', 'Avisos de rota', 'Notificações em todos os aparelhos'])
      expect(screen.getByText(t)).toBeInTheDocument();
  });

  it('o botão só liga quando a palavra bate', () => {
    expect(botao()).toBeDisabled();
    digitar('excluir conta');
    expect(botao()).toBeDisabled();
    digitar(' Excluir ');
    expect(botao()).toBeEnabled();
  });

  it('envia a palavra e o motivo escolhido', () => {
    h.excluir.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByRole('button', { name: 'Recebo avisos demais' }));
    digitar('EXCLUIR');
    fireEvent.click(botao());
    expect(h.excluir).toHaveBeenCalledWith('excluir', 'avisos_demais');
  });

  it('tocar de novo no motivo desmarca', () => {
    h.excluir.mockReturnValue(new Promise(() => {}));
    const chip = screen.getByRole('button', { name: 'Saí de São Paulo' });
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    digitar('excluir');
    fireEvent.click(botao());
    expect(h.excluir).toHaveBeenCalledWith('excluir', undefined);
  });

  it('durante o envio mostra "Excluindo…" e não chama de novo', async () => {
    h.excluir.mockReturnValue(new Promise(() => {}));
    digitar('excluir');
    fireEvent.click(botao());
    expect(await screen.findByRole('button', { name: 'Excluindo…' })).toBeDisabled();
    fireEvent.click(botao());
    expect(h.excluir).toHaveBeenCalledTimes(1);
  });

  it('erro do servidor vira toast com a mensagem dele e o botão volta', async () => {
    h.excluir.mockRejectedValue({ response: { data: { mensagem: 'Contas de administrador não podem ser excluídas por aqui.' } } });
    digitar('excluir');
    fireEvent.click(botao());
    expect(await screen.findByRole('button', { name: 'Excluir minha conta' })).toBeEnabled();
    expect(h.toast).toHaveBeenCalledWith('Contas de administrador não podem ser excluídas por aqui.', 'error');
  });

  it('erro sem mensagem usa o texto padrão', async () => {
    h.excluir.mockRejectedValue(new Error('rede'));
    digitar('excluir');
    fireEvent.click(botao());
    await vi.waitFor(() =>
      expect(h.toast).toHaveBeenCalledWith('Não foi possível excluir a conta agora. Tente de novo em instantes.', 'error'));
  });
});
