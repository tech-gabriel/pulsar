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

import BuscaEndereco from '../../../components/mapa/BuscaEndereco';

const resultados: EnderecoBusca[] = [
  { nome: 'Av. Paulista', descricao: 'Av. Paulista, São Paulo', tipo: 'address', latitude: -23.561, longitude: -46.656 },
];

beforeEach(() => {
  vi.clearAllMocks();
  hookState = { termo: '', setTermo, resultados: [], carregando: false, erro: null, limpar };
});

describe('BuscaEndereco', () => {
  it('renderiza o campo de busca', () => {
    render(<BuscaEndereco onSelecionar={vi.fn()} isMobile={false} />);
    expect(screen.getByLabelText('Buscar lugar, rua ou bairro')).toBeInTheDocument();
  });

  it('chama setTermo ao digitar', () => {
    render(<BuscaEndereco onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.change(screen.getByLabelText('Buscar lugar, rua ou bairro'), {
      target: { value: 'paulista' },
    });
    expect(setTermo).toHaveBeenCalledWith('paulista');
  });

  it('lista resultados e dispara onSelecionar ao clicar', () => {
    hookState = { termo: 'paulista', setTermo, resultados, carregando: false, erro: null, limpar };
    const onSelecionar = vi.fn();
    render(<BuscaEndereco onSelecionar={onSelecionar} isMobile={false} />);

    // foco abre o dropdown (termo já tem >= 3 chars)
    fireEvent.focus(screen.getByLabelText('Buscar lugar, rua ou bairro'));
    fireEvent.click(screen.getByText('Av. Paulista'));

    expect(onSelecionar).toHaveBeenCalledWith(resultados[0]);
  });

  it('limpa a busca ao clicar no X', () => {
    hookState = { termo: 'paulista', setTermo, resultados: [], carregando: false, erro: null, limpar };
    render(<BuscaEndereco onSelecionar={vi.fn()} isMobile={false} />);
    fireEvent.click(screen.getByLabelText('Limpar busca'));
    expect(limpar).toHaveBeenCalled();
  });
});

describe('BuscaEndereco — botão de localização', () => {
  beforeEach(() => localStorage.clear());

  it('dispara onUsarLocalizacao ao clicar no botão', () => {
    const onUsar = vi.fn();
    render(<BuscaEndereco onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={onUsar} />);
    fireEvent.click(screen.getByRole('button', { name: /usar minha localização/i }));
    expect(onUsar).toHaveBeenCalledTimes(1);
  });

  it('desabilita o botão enquanto localizando', () => {
    render(<BuscaEndereco onSelecionar={() => {}} isMobile={false} onUsarLocalizacao={() => {}} localizando />);
    expect(screen.getByRole('button', { name: /usar minha localização/i })).toBeDisabled();
  });
});
