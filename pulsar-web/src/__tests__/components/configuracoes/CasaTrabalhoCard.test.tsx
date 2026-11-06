import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  favoritos: [{ subprefeituraId: 's', nome: 'Mooca' }] as unknown[],
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ usuario: { id: 'u1' } }) }));
vi.mock('../../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: h.toast }) }));
vi.mock('../../../hooks/useIsMobile', () => ({ useIsMobile: () => true }));
vi.mock('../../../hooks/useFavoritos', () => ({ useFavoritos: () => ({ favoritos: h.favoritos }) }));
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

const casa = { tipo: 'CASA', rotulo: 'Rua A, 10', latitude: -23.5, longitude: -46.6, subprefeituraId: 's', subprefeituraNome: 'Mooca' };
const novo = { lat: -23.55, lon: -46.61, rotulo: 'Rua da Mooca', fonte: 'endereco' };

const escolherNaBusca = () => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Mooca' } });
  fireEvent.click(screen.getByRole('button', { name: /Rua da Mooca/ }));
};

const abrirFolhaDaCasa = () => {
  h.locais = { CASA: casa };
  render(<CasaTrabalhoCard />);
  fireEvent.click(screen.getByRole('button', { name: /^Casa/ }));
  return screen.getByRole('dialog', { name: 'Casa' });
};

describe('CasaTrabalhoCard', () => {
  beforeEach(() => {
    h.locais = {}; h.carregando = false; h.subId = 'sub-1'; h.dados = {}; h.subs = [{ id: 's' }];
    h.favoritos = [{ subprefeituraId: 's', nome: 'Mooca' }];
    h.salvar.mockReset().mockResolvedValue(true);
    h.apagar.mockReset().mockResolvedValue(true);
    h.toast.mockReset();
  });

  it('sem locais: as duas linhas oferecem "Salvar" e nenhuma tem subtítulo', () => {
    render(<CasaTrabalhoCard />);
    expect(screen.getByRole('button', { name: 'Salvar casa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar trabalho' })).toBeInTheDocument();
    expect(screen.queryByText('Não salvo')).toBeNull();
  });

  it('carregando não oferece ação nenhuma', () => {
    h.carregando = true;
    render(<CasaTrabalhoCard />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getAllByText('Carregando…')).toHaveLength(2);
  });

  it('com casa: a linha mostra o endereço e abre a folha com Trocar e Apagar', () => {
    const folha = abrirFolhaDaCasa();
    expect(folha).toHaveTextContent('Rua A, 10');
    expect(screen.getByRole('button', { name: 'Trocar endereço' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apagar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('Apagar pede confirmação e só então apaga', async () => {
    abrirFolhaDaCasa();
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    const conf = screen.getByRole('dialog', { name: 'Apagar o endereço da sua casa?' });
    expect(conf).toHaveTextContent('Rua A, 10 sai da sua conta. Mooca continua nas suas favoritas.');
    expect(h.apagar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apagar casa' }));
    await waitFor(() => expect(h.apagar).toHaveBeenCalledWith('CASA'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('a confirmação de apagar não promete a favorita que a pessoa já tirou', () => {
    h.favoritos = [];
    abrirFolhaDaCasa();
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Rua A, 10 sai da sua conta.');
    expect(screen.getByRole('dialog')).not.toHaveTextContent('favoritas');
  });

  it('Cancelar na confirmação não apaga', async () => {
    abrirFolhaDaCasa();
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(h.apagar).not.toHaveBeenCalled();
  });

  it('a confirmação foca o Cancelar e, ao fechar, o foco volta para a linha da Casa', async () => {
    h.locais = { CASA: casa };
    render(<CasaTrabalhoCard />);
    const linha = screen.getByRole('button', { name: /^Casa/ });
    linha.focus();
    fireEvent.click(linha);
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(linha).toHaveFocus());
  });

  it('depois de confirmar Apagar, o foco fica na linha da Casa', async () => {
    abrirFolhaDaCasa();
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    h.locais = {}; // o hook real tira a casa ao apagar
    fireEvent.click(screen.getByRole('button', { name: 'Apagar casa' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /casa/i })));
  });

  it('depois de confirmar Trocar, o foco fica na linha da Casa', async () => {
    abrirFolhaDaCasa();
    fireEvent.click(screen.getByRole('button', { name: 'Trocar endereço' }));
    escolherNaBusca();
    await screen.findByRole('dialog', { name: /^Trocar a casa/ });
    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Casa/ })));
  });

  it('Trocar: escolher o endereço pede confirmação e só salva depois de "Trocar"', async () => {
    abrirFolhaDaCasa();
    fireEvent.click(screen.getByRole('button', { name: 'Trocar endereço' }));
    escolherNaBusca();
    const conf = await screen.findByRole('dialog', { name: 'Trocar a casa para Rua da Mooca?' });
    expect(conf).toHaveTextContent('O endereço atual, Rua A, 10, deixa de ser usado na Rota.');
    expect(h.salvar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    await waitFor(() => expect(h.salvar).toHaveBeenCalledWith('CASA', novo, 'sub-1', 'configuracoes'));
  });

  it('Cancelar na confirmação de trocar não salva', async () => {
    abrirFolhaDaCasa();
    fireEvent.click(screen.getByRole('button', { name: 'Trocar endereço' }));
    escolherNaBusca();
    const conf = await screen.findByRole('dialog', { name: /^Trocar a casa/ });
    fireEvent.click(within(conf).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(h.salvar).not.toHaveBeenCalled();
  });

  it('Trabalho vazio: "Salvar" abre a busca direto e salva sem confirmação', async () => {
    render(<CasaTrabalhoCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar trabalho' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    escolherNaBusca();
    await waitFor(() => expect(h.salvar).toHaveBeenCalledWith('TRABALHO', novo, 'sub-1', 'configuracoes'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('escolhe o endereço só com o teclado (Tab até o resultado e Enter)', async () => {
    const user = userEvent.setup();
    render(<CasaTrabalhoCard />);
    await user.click(screen.getByRole('button', { name: 'Salvar casa' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Salvar casa' }));
    escolherNaBusca();
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('Esse endereço fica fora da cidade de São Paulo.', 'error'));
    expect(h.salvar).not.toHaveBeenCalled();
  });

  it('contorno ainda não carregou: avisa que está carregando e não salva', async () => {
    h.dados = null;
    render(<CasaTrabalhoCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar casa' }));
    escolherNaBusca();
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('Ainda carregando o mapa das regiões. Tente de novo em instantes.', 'info'));
    expect(h.toast).not.toHaveBeenCalledWith(expect.stringContaining('fora da cidade'), 'error');
    expect(h.salvar).not.toHaveBeenCalled();
  });
});
