import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnderecoBusca } from '../../../types';

const setTermo = vi.fn();
const limpar = vi.fn();

interface HookState {
  termo: string;
  setTermo: typeof setTermo;
  resultados: EnderecoBusca[];
  carregando: boolean;
  erro: string | null;
  limpar: typeof limpar;
}

let hookState: HookState;

vi.mock('../../../hooks/useBuscaEndereco', () => ({
  useBuscaEndereco: () => hookState,
}));

import BuscaUnificada from '../../../components/mapa/BuscaUnificada';
import type { Area } from '../../../features/cidade/areas';

const resultados: EnderecoBusca[] = [
  { nome: 'Av. Paulista', descricao: 'Av. Paulista, São Paulo', tipo: 'address', latitude: -23.561, longitude: -46.656 },
];

beforeEach(() => {
  vi.clearAllMocks();
  hookState = { termo: '', setTermo, resultados: [], carregando: false, erro: null, limpar };
});

describe('BuscaUnificada', () => {
  it('renderiza o campo de busca', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    expect(screen.getByLabelText('Buscar subprefeitura ou endereço')).toBeInTheDocument();
  });

  it('chama setTermo ao digitar', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.change(screen.getByLabelText('Buscar subprefeitura ou endereço'), {
      target: { value: 'paulista' },
    });
    expect(setTermo).toHaveBeenCalledWith('paulista');
  });

  it('lista resultados e dispara onSelecionar ao clicar', () => {
    hookState = { termo: 'paulista', setTermo, resultados, carregando: false, erro: null, limpar };
    const onSelecionar = vi.fn();
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={onSelecionar} isMobile={false} />);

    // foco abre o dropdown (termo já tem >= 3 chars)
    fireEvent.focus(screen.getByLabelText('Buscar subprefeitura ou endereço'));
    fireEvent.click(screen.getByText('Av. Paulista'));

    expect(onSelecionar).toHaveBeenCalledWith(resultados[0]);
  });

  it('limpa a busca ao clicar no X', () => {
    hookState = { termo: 'paulista', setTermo, resultados: [], carregando: false, erro: null, limpar };
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.click(screen.getByLabelText('Limpar busca'));
    expect(limpar).toHaveBeenCalled();
  });
});

describe('BuscaEndereco — botão de localização', () => {
  beforeEach(() => localStorage.clear());

  it('dispara onUsarLocalizacao ao clicar no botão', () => {
    const onUsar = vi.fn();
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={onUsar} />);
    fireEvent.click(screen.getByRole('button', { name: /usar minha localização/i }));
    expect(onUsar).toHaveBeenCalledTimes(1);
  });

  it('desabilita o botão enquanto localizando', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={() => {}} localizando />);
    expect(screen.getByRole('button', { name: /usar minha localização/i })).toBeDisabled();
  });

  it('mostra a dica na 1ª visita e a esconde ao clicar no botão', () => {
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={() => {}} />);
    expect(screen.getByText('Toque no alvo para ver a sua subprefeitura')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /usar minha localização/i }));
    expect(screen.queryByText('Toque no alvo para ver a sua subprefeitura')).not.toBeInTheDocument();
  });

  it('não mostra a dica quando ela já foi vista', () => {
    localStorage.setItem('pulsar-dica-localizacao-vista', '1');
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={() => {}} />);
    expect(screen.queryByText('Toque no alvo para ver a sua subprefeitura')).not.toBeInTheDocument();
  });

  it('mostra subprefeituras antes dos endereços e abre a escolhida', () => {
    const onSelecionarArea = vi.fn();
    const mooca = { id: 's2', nome: 'Mooca', zona: 'Leste', faixaRisco: 'MODERADO' } as Area;
    hookState = { ...hookState, termo: 'mo', resultados };
    render(<BuscaUnificada areas={[mooca]} onSelecionarArea={onSelecionarArea} onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.focus(screen.getByLabelText('Buscar subprefeitura ou endereço'));
    expect(screen.getByText('Subprefeituras')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mooca/ }));
    expect(onSelecionarArea).toHaveBeenCalledWith(mooca);
  });

  it('sem subprefeitura nem endereço: mensagem única', () => {
    hookState = { ...hookState, termo: 'xyzw', resultados: [] };
    render(<BuscaUnificada areas={[]} onSelecionarArea={vi.fn()} onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.focus(screen.getByLabelText('Buscar subprefeitura ou endereço'));
    expect(screen.getByText('Nenhuma subprefeitura ou endereço com esse nome.')).toBeInTheDocument();
  });
});
