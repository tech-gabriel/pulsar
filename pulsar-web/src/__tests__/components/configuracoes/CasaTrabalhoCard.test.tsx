import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({
  locais: {} as Record<string, unknown>,
  carregando: false,
  salvar: vi.fn(),
  apagar: vi.fn(),
  toast: vi.fn(),
  subId: 'sub-1' as string | null,
  dados: {} as object | null,
  subs: [{ id: 's' }] as unknown[],
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 'u1' } }) }));
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: h.toast }) }));
vi.mock('../../../hooks/useLocaisSalvos', () => ({
  useLocaisSalvos: () => ({ locais: h.locais, carregando: h.carregando, salvar: h.salvar, apagar: h.apagar }),
}));
vi.mock('../../../hooks/useSubprefeituras', () => ({ useSubprefeituras: () => ({ subprefeituras: h.subs }) }));
vi.mock('../../../hooks/useJsonPublico', () => ({ useJsonPublico: () => ({ dados: h.dados, erro: false }) }));
vi.mock('../../../features/locais/regras', async (orig) => ({
  ...(await orig<object>()),
  subprefeituraIdDoPonto: () => h.subId,
}));
vi.mock('../../../hooks/useBuscaEndereco', () => ({
  useBuscaEndereco: () => ({
    setTermo: vi.fn(), carregando: false, limpar: vi.fn(),
    resultados: [{ nome: 'Rua da Mooca', descricao: 'Rua da Mooca, São Paulo', tipo: 'address', latitude: -23.55, longitude: -46.61 }],
  }),
}));

import CasaTrabalhoCard from '../../../components/configuracoes/CasaTrabalhoCard';

const casa = { tipo: 'CASA', rotulo: 'Rua A, 10', latitude: -23.5, longitude: -46.6, subprefeituraId: 's' };

describe('CasaTrabalhoCard', () => {
  beforeEach(() => {
    h.locais = {}; h.carregando = false; h.subId = 'sub-1'; h.dados = {}; h.subs = [{ id: 's' }];
    h.salvar.mockReset().mockResolvedValue(true);
    h.apagar.mockReset().mockResolvedValue(true);
    h.toast.mockReset();
  });

  it('sem locais mostra "Não salvo" e "Salvar" para os dois tipos', () => {
    render(<CasaTrabalhoCard />);
    expect(screen.getAllByText('Não salvo')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Salvar' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Apagar' })).toBeNull();
  });

  it('carregando não oferece Salvar nem "Não salvo"', () => {
    h.carregando = true;
    render(<CasaTrabalhoCard />);
    expect(screen.queryByText('Não salvo')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
  });

  it('com casa mostra o rótulo, Trocar e Apagar', () => {
    h.locais = { CASA: casa };
    render(<CasaTrabalhoCard />);
    expect(screen.getByText('Rua A, 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apagar' })).toBeInTheDocument();
  });

  it('Apagar pede confirmação na linha e só então apaga', async () => {
    h.locais = { CASA: casa };
    render(<CasaTrabalhoCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    expect(h.apagar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Apagar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    await waitFor(() => expect(h.apagar).toHaveBeenCalledWith('CASA'));
  });

  it('Trocar, digitar e escolher o endereço salva com origem configuracoes', async () => {
    h.locais = { CASA: casa };
    render(<CasaTrabalhoCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mooca' } });
    fireEvent.click(screen.getByRole('button', { name: /Rua da Mooca/ }));
    await waitFor(() => expect(h.salvar).toHaveBeenCalledWith(
      'CASA',
      { lat: -23.55, lon: -46.61, rotulo: 'Rua da Mooca', fonte: 'endereco' },
      'sub-1',
      'configuracoes',
    ));
  });

  it('escolhe o endereço só com o teclado (Tab até o resultado e Enter)', async () => {
    const user = userEvent.setup();
    render(<CasaTrabalhoCard />);
    await user.click(screen.getAllByRole('button', { name: 'Salvar' })[0]);
    await user.keyboard('Mooca');
    await user.tab(); // Cancelar
    await user.tab();
    expect(screen.getByRole('button', { name: /Rua da Mooca/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(h.salvar).toHaveBeenCalledWith('CASA', expect.objectContaining({ rotulo: 'Rua da Mooca' }), 'sub-1', 'configuracoes'));
  });

  it('endereço fora de SP avisa e não salva', async () => {
    h.subId = null;
    render(<CasaTrabalhoCard />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[0]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mooca' } });
    fireEvent.click(screen.getByRole('button', { name: /Rua da Mooca/ }));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('Esse endereço fica fora da cidade de São Paulo.', 'error'));
    expect(h.salvar).not.toHaveBeenCalled();
  });

  it('contorno ainda não carregou: avisa que está carregando e não salva', async () => {
    h.dados = null;
    render(<CasaTrabalhoCard />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[0]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mooca' } });
    fireEvent.click(screen.getByRole('button', { name: /Rua da Mooca/ }));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('Ainda carregando o mapa das regiões. Tente de novo em instantes.', 'info'));
    expect(h.toast).not.toHaveBeenCalledWith(expect.stringContaining('fora da cidade'), 'error');
    expect(h.salvar).not.toHaveBeenCalled();
  });
});
